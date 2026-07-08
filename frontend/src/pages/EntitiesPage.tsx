import { type FormEvent, useEffect, useState } from 'react'
import { entitiesApi } from '../api'
import { Layout } from '../components/Layout'
import { Link } from '../router'
import type { EntityInput, SimpleEntity } from '../types'

const emptyForm: EntityInput = {
  name: '',
  description: '',
  type: '',
}

export function EntitiesPage() {
  const [entities, setEntities] = useState<SimpleEntity[]>([])
  const [form, setForm] = useState<EntityInput>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadEntities = () => {
    return entitiesApi.list().then(setEntities)
  }

  useEffect(() => {
    loadEntities().finally(() => setLoading(false))
  }, [])

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const id = await entitiesApi.create(form)
      setEntities((prev) => [
        ...prev,
        { id, name: form.name, description: form.description, type: form.type },
      ])
      setForm(emptyForm)
    } catch {
      // как в оригинальном site.js — ошибки глотаются
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    const isConfirmed = confirm(`Вы уверены, что хотите удалить сущность с id ${id}`)
    if (!isConfirmed) return

    setEntities((prev) => prev.filter((entity) => entity.id !== id))
    try {
      await entitiesApi.delete(id)
    } catch {
      await loadEntities()
    }
  }

  return (
    <Layout title="Список сущностей">
      <h1>Список сущностей</h1>

      <h3>Добавить новую сущность</h3>
      <form onSubmit={handleAdd}>
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
          Добавить
        </button>
      </form>

      <h3>Список сущностей</h3>

      {loading ? (
        <p>Загрузка…</p>
      ) : (
        <>
          <table className="table table-hover">
            <thead>
              <tr>
                <td>Id</td>
                <td>Имя</td>
                <td>Описание</td>
                <td>Тип</td>
                <td />
              </tr>
            </thead>
            <tbody>
              {entities.map((entity) => (
                <tr key={entity.id}>
                  <td>{entity.id}</td>
                  <td>
                    <Link to={`/entities/entity/${entity.id}`}>{entity.name}</Link>
                  </td>
                  <td>{entity.description}</td>
                  <td>{entity.type}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => handleDelete(entity.id)}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {entities.length === 0 && <p>Еще нет ни одной сущности</p>}
        </>
      )}
    </Layout>
  )
}
