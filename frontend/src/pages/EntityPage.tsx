import { type FormEvent, useEffect, useState } from 'react'
import { entitiesApi } from '../api'
import { Layout } from '../components/Layout'
import type { EntityInput, SimpleEntity } from '../types'

interface EntityPageProps {
  id: number
}

export function EntityPage({ id }: EntityPageProps) {
  const [entity, setEntity] = useState<SimpleEntity | null>(null)
  const [form, setForm] = useState<EntityInput | null>(null)
  const [saving, setSaving] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    entitiesApi
      .get(id)
      .then((data) => {
        setEntity(data)
        setForm({
          name: data.name,
          description: data.description,
          type: data.type,
        })
      })
      .catch(() => setNotFound(true))
  }, [id])

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    if (!form) return

    setSaving(true)
    try {
      await entitiesApi.update(id, form)
      setEntity((prev: SimpleEntity | null) => (prev ? { ...prev, ...form } : prev))
    } catch {
      // как в оригинальном site.js
    } finally {
      setSaving(false)
    }
  }

  if (notFound) {
    return (
      <Layout title="Сущность не найдена">
        <h1>Сущность не найдена</h1>
      </Layout>
    )
  }

  if (!entity || !form) {
    return (
      <Layout title="Загрузка">
        <p>Загрузка…</p>
      </Layout>
    )
  }

  return (
    <Layout title={`Сущность ${entity.name}`}>
      <h1>Сущность {entity.name}</h1>

      <form onSubmit={handleSave}>
        <div className="row">
          <label className="form-label col col-lg-6">
            Id
            <input
              type="text"
              name="id"
              className="form-control"
              disabled
              value={entity.id}
            />
          </label>
        </div>
        <div className="row">
          <label className="form-label col col-lg-6">
            Имя
            <input
              type="text"
              name="name"
              className="form-control"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
        </div>
        <div className="row">
          <label className="form-label col col-lg-6">
            Описание
            <input
              type="text"
              name="description"
              className="form-control"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
        </div>
        <div className="row">
          <label className="form-label col col-lg-6">
            Тип
            <input
              type="text"
              name="type"
              className="form-control"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            />
          </label>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          Сохранить
        </button>
      </form>
    </Layout>
  )
}
