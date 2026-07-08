import { useEffect, useState } from 'react'
import { servicesApi } from '../api'
import { Layout } from '../components/Layout'
import type { LifecycleDemo } from '../types'

export function ServicesPage() {
  const [data, setData] = useState<LifecycleDemo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    servicesApi
      .lifecycle()
      .then(setData)
      .catch((err: Error) => setError(err.message))
  }, [])

  return (
    <Layout title="Демонстрация жизненных циклов">
      <div className="text-center">
        <h1 className="display-4">Демонстрация жизненных циклов</h1>
        <p>
          Transient каждый разный в каждом столбце. Scoped меняется только при
          перезагрузке страницы. Singleton всегда один.
        </p>
        {error && <p className="text-danger">{error}</p>}
        {data && (
          <table className="table table-hover">
            <tbody>
              <tr>
                <td>
                  <b>Жизненный цикл</b>
                </td>
                <td>
                  <b>Полученны в контроллере</b>
                </td>
                <td>
                  <b>Полученны во View</b>
                </td>
              </tr>
              <tr>
                <td>
                  <b>Transient</b>
                </td>
                <td>{data.transient.controller}</td>
                <td>{data.transient.view}</td>
              </tr>
              <tr>
                <td>
                  <b>Scoped</b>
                </td>
                <td>{data.scoped.controller}</td>
                <td>{data.scoped.view}</td>
              </tr>
              <tr>
                <td>
                  <b>Singleton</b>
                </td>
                <td>{data.singleton.controller}</td>
                <td>{data.singleton.view}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  )
}
