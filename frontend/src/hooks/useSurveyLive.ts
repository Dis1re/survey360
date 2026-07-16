import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr'
import { useEffect, useRef } from 'react'
import { getAuthToken } from '../authStorage'

export type SurveyUpdatedEvent = {
  surveyId: number
  status: string
}

type Handler = (event: SurveyUpdatedEvent) => void

let sharedConnection: HubConnection | null = null
let startPromise: Promise<void> | null = null
const handlers = new Set<Handler>()

function normalizeEvent(raw: unknown): SurveyUpdatedEvent | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  const surveyId = data.surveyId ?? data.SurveyId
  const status = data.status ?? data.Status
  if (typeof surveyId !== 'number' || typeof status !== 'string') return null
  return { surveyId, status }
}

function dispatch(raw: unknown) {
  const event = normalizeEvent(raw)
  if (!event) return
  for (const handler of handlers) {
    try {
      handler(event)
    } catch (err) {
      console.error(err)
    }
  }
}

function getConnection(): HubConnection {
  if (sharedConnection) return sharedConnection

  sharedConnection = new HubConnectionBuilder()
    .withUrl('/hubs/survey', {
      withCredentials: true,
      accessTokenFactory: () => getAuthToken() ?? '',
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build()

  sharedConnection.on('SurveyUpdated', dispatch)
  sharedConnection.onreconnected(() => {
    // No-op: handlers stay registered on the same connection instance.
  })

  return sharedConnection
}

async function ensureStarted() {
  const connection = getConnection()
  if (connection.state === HubConnectionState.Connected) return
  if (connection.state === HubConnectionState.Connecting) {
    await startPromise
    return
  }

  startPromise = connection.start().catch((err) => {
    console.error('SignalR connect failed', err)
    startPromise = null
    throw err
  })
  await startPromise
}

function subscribe(handler: Handler): () => void {
  handlers.add(handler)
  void ensureStarted().catch(() => {
    /* live updates are optional; REST still works */
  })

  return () => {
    handlers.delete(handler)
  }
}

/** Subscribes to survey status/progress live updates from the backend hub. */
export function useSurveyLive(onUpdated: Handler) {
  const handlerRef = useRef(onUpdated)
  handlerRef.current = onUpdated

  useEffect(() => {
    return subscribe((event) => handlerRef.current(event))
  }, [])
}
