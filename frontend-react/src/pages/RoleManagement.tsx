import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import BaseModal from '@/components/BaseModal'
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/api'
import { deleteWithUndo } from '@/hooks/useUndoableDelete'

interface RolePermission {
  id: number
  slug: string
  effect: 'allow' | 'deny'
}

interface Role {
  id: number
  slug: string
  name: string
  description: string | null
  is_system: boolean
  permissions: RolePermission[]
  parent_roles: Array<{ id: number; name: string }>
}

interface Permission {
  id: number
  slug: string
  name: string
  module: string | null
  description: string | null
}

interface SelectedPermission {
  id: number
  effect: 'allow' | 'deny'
}

export default function RoleManagement() {
  const { t } = useTranslation()
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [modalVisible, setModalVisible] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [activeTab, setActiveTab] = useState('general')
  const [formData, setFormData] = useState({ slug: '', name: '', description: '' })
  const [selectedPermissions, setSelectedPermissions] = useState<SelectedPermission[]>([])
  const [selectedParents, setSelectedParents] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [permissionsLoading, setPermissionsLoading] = useState(false)

  const loadRoles = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiGet('/admin/roles')
      setRoles(res.roles ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('roles.connectionError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { loadRoles() }, [loadRoles])

  const loadPermissions = useCallback(async () => {
    if (permissions.length > 0) return // вже завантажено
    setPermissionsLoading(true)
    try {
      const res = await apiGet('/admin/permissions')
      setPermissions(res.permissions ?? [])
    } catch {
      // список прав не критичний для відкриття картки
    } finally {
      setPermissionsLoading(false)
    }
  }, [permissions.length])

  // Групування прав по модулях
  const groupedPermissions = Object.values(
    permissions.reduce<Record<string, { name: string; permissions: Permission[] }>>((acc, perm) => {
      const module = perm.module || 'other'
      acc[module] ??= { name: module, permissions: [] }
      acc[module].permissions.push(perm)
      return acc
    }, {})
  )

  const otherRoles = selectedRole ? roles.filter(r => r.id !== selectedRole.id) : []

  const isPermissionSelected = (id: number) => selectedPermissions.some(p => p.id === id)
  const getPermissionEffect = (id: number) =>
    selectedPermissions.find(p => p.id === id)?.effect ?? 'allow'

  const togglePermission = (id: number, checked: boolean) => {
    setSelectedPermissions(prev =>
      checked
        ? (prev.some(p => p.id === id) ? prev : [...prev, { id, effect: 'allow' as const }])
        : prev.filter(p => p.id !== id)
    )
  }

  const setPermissionEffect = (id: number, effect: 'allow' | 'deny') => {
    setSelectedPermissions(prev => prev.map(p => (p.id === id ? { ...p, effect } : p)))
  }

  const openCreateModal = () => {
    setModalMode('create')
    setSelectedRole({} as Role)
    setFormData({ slug: '', name: '', description: '' })
    setSelectedPermissions([])
    setSelectedParents([])
    setActiveTab('general')
    setSaveError('')
    setModalVisible(true)
    loadPermissions()
  }

  const openEditModal = (role: Role) => {
    setModalMode('edit')
    setSelectedRole(role)
    setFormData({ slug: role.slug, name: role.name, description: role.description ?? '' })
    setSelectedPermissions(role.permissions.map(p => ({ id: p.id, effect: p.effect ?? 'allow' })))
    setSelectedParents(role.parent_roles.map(p => p.id))
    setActiveTab('general')
    setSaveError('')
    setModalVisible(true)
    loadPermissions()
  }

  const closeModal = () => {
    setModalVisible(false)
    setSelectedRole(null)
  }

  const saveRole = async () => {
    setSaving(true)
    setSaveError('')

    try {
      // 1. Загальна інформація
      let roleId = selectedRole?.id
      if (modalMode === 'create') {
        const res = await apiPost('/admin/roles', formData)
        roleId = res.role.id
      } else {
        await apiPut(`/admin/roles/${roleId}`, formData)
      }

      // 2. Права
      await apiPost(`/admin/roles/${roleId}/permissions`, { permissions: selectedPermissions })

      // 3. Ієрархія
      await apiPost(`/admin/roles/${roleId}/hierarchy`, { parent_role_ids: selectedParents })

      await loadRoles()
      closeModal()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('roles.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const deleteRole = (role: Role) => {
    const index = roles.findIndex(r => r.id === role.id)
    if (index === -1) return

    deleteWithUndo({
      message: t('roles.deleteConfirm', { name: role.name }),
      remove: () => setRoles(list => list.filter(r => r.id !== role.id)),
      restore: () => setRoles(list => {
        const restored = [...list]
        restored.splice(index, 0, role)
        return restored
      }),
      commit: async () => { await apiDelete(`/admin/roles/${role.id}`) },
      onCommitError: () => loadRoles(),
    })
  }

  const tabs = [
    { key: 'general', label: t('roles.generalInfo'), icon: 'bi-info-circle' },
    { key: 'permissions', label: t('roles.permissions'), icon: 'bi-shield-check' },
    { key: 'hierarchy', label: t('roles.hierarchy'), icon: 'bi-diagram-3' },
  ]

  return (
    <>
      <div className="container-fluid py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="mb-0">{t('roles.title')}</h4>
          <button onClick={openCreateModal} className="btn btn-primary btn-sm">
            <i className="bi bi-plus-lg me-1" />{t('roles.createButton')}
          </button>
        </div>

        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" />
          </div>
        )}

        {!loading && error && <div className="alert alert-danger">{error}</div>}

        {!loading && !error && (
          <div className="card">
            <div className="card-body p-0">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '60px' }}>{t('roles.colId')}</th>
                    <th>{t('roles.colName')}</th>
                    <th>{t('roles.colSlug')}</th>
                    <th>{t('roles.permissions')}</th>
                    <th>{t('roles.colParentRoles')}</th>
                    <th style={{ width: '100px' }}>{t('roles.colSystem')}</th>
                    <th style={{ width: '100px' }} className="text-end">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map(role => (
                    <tr key={role.id}>
                      <td className="text-muted">{role.id}</td>
                      <td>
                        <strong>{role.name}</strong>
                        {role.description && <div className="small text-muted">{role.description}</div>}
                      </td>
                      <td><code className="small">{role.slug}</code></td>
                      <td>
                        {role.permissions.length > 0 ? (
                          <>
                            {role.permissions.slice(0, 3).map(perm => (
                              <span
                                key={perm.id}
                                className={`badge me-1 small ${perm.effect === 'deny' ? 'bg-danger' : 'bg-info'}`}
                                style={{ fontSize: '0.75rem' }}
                                title={perm.effect === 'deny' ? t('roles.deny') : t('roles.allow')}
                              >
                                {perm.effect === 'deny' ? '⊘ ' : ''}{perm.slug}
                              </span>
                            ))}
                            {role.permissions.length > 3 && (
                              <span className="text-muted small">{t('roles.morePermissions', { count: role.permissions.length - 3 })}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                      <td>
                        {role.parent_roles.length > 0 ? (
                          role.parent_roles.map(parent => (
                            <span key={parent.id} className="badge bg-secondary me-1 small">{parent.name}</span>
                          ))
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                      <td className="text-center">
                        {role.is_system
                          ? <span className="text-success" title={t('roles.systemRoleTitle')}><i className="bi bi-shield-lock-fill" /></span>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td className="text-end">
                        <button onClick={() => openEditModal(role)} className="btn btn-sm btn-outline-primary me-1">
                          <i className="bi bi-pencil" />
                        </button>
                        {role.is_system ? (
                          <span
                            className="text-muted small"
                            style={{ display: 'inline-block', width: '36px', textAlign: 'center' }}
                            title={t('roles.systemRoleProtected')}
                          >
                            <i className="bi bi-lock-fill" />
                          </span>
                        ) : (
                          <button onClick={() => deleteRole(role)} className="btn btn-sm btn-outline-danger">
                            <i className="bi bi-trash" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modalVisible && selectedRole && (
        <BaseModal
          visible={modalVisible}
          onClose={closeModal}
          title={<h5 className="mb-0">{modalMode === 'create' ? t('roles.createTitle') : t('roles.editTitle')}</h5>}
          subheader={
            <ul className="nav nav-tabs border-0">
              {tabs.map(tab => (
                <li key={tab.key} className="nav-item">
                  <button
                    className={`nav-link py-2 px-2 small text-nowrap ${activeTab === tab.key ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    <i className={`bi ${tab.icon} me-1`} />{tab.label}
                  </button>
                </li>
              ))}
            </ul>
          }
          footer={
            <>
              <div />
              <div className="d-flex gap-2">
                <button onClick={closeModal} className="btn btn-secondary btn-sm">{t('common.cancel')}</button>
                <button onClick={saveRole} className="btn btn-primary btn-sm" disabled={saving}>
                  {saving && <span className="spinner-border spinner-border-sm me-1" />}
                  {t('common.save')}
                </button>
              </div>
            </>
          }
          storageKey="role-management-modal"
          defaultWidth={700}
          minWidth={500}
          maxWidth={1200}
          defaultHeight={500}
          minHeight={400}
          maxHeight={800}
        >
          {saveError && <div className="alert alert-danger small mb-3">{saveError}</div>}

          {/* Загальна інформація */}
          {activeTab === 'general' && (
            <>
              <div className="mb-3">
                <label className="form-label small mb-1">{t('roles.slugLabel')}</label>
                <input
                  value={formData.slug}
                  onChange={(e) => setFormData(f => ({ ...f, slug: e.target.value }))}
                  type="text"
                  className="form-control form-control-sm"
                  readOnly={modalMode === 'edit' && selectedRole.is_system}
                  placeholder={t('roles.slugPlaceholder')}
                />
                <div className="form-text small">{t('roles.slugHint')}</div>
              </div>

              <div className="mb-3">
                <label className="form-label small mb-1">{t('roles.nameLabel')}</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                  type="text"
                  className="form-control form-control-sm"
                  placeholder={t('roles.namePlaceholder')}
                />
              </div>

              <div className="mb-3">
                <label className="form-label small mb-1">{t('common.description')}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                  className="form-control form-control-sm"
                  rows={3}
                  placeholder={t('roles.descriptionPlaceholder')}
                />
              </div>

              {selectedRole.is_system && (
                <div className="alert alert-warning small">
                  <i className="bi bi-exclamation-triangle me-1" />
                  {t('roles.systemEditWarning')}
                </div>
              )}
            </>
          )}

          {/* Права доступу */}
          {activeTab === 'permissions' && (
            <>
              <div className="alert alert-info small mb-3">
                <i className="bi bi-info-circle me-1" />
                {t('roles.permissionsHint')}
              </div>

              {permissionsLoading ? (
                <div className="text-center py-5">
                  <div className="spinner-border spinner-border-sm text-primary" />
                </div>
              ) : (
                groupedPermissions.map(module => (
                  <div key={module.name} className="mb-3">
                    <h6 className="mb-2">
                      <strong>{module.name}</strong>
                      <span className="text-muted small"> ({module.permissions.length})</span>
                    </h6>
                    {module.permissions.map(perm => (
                      <div key={perm.id} className="mb-2 d-flex align-items-start gap-2">
                        <input
                          className="form-check-input mt-1"
                          type="checkbox"
                          id={`perm-${perm.id}`}
                          checked={isPermissionSelected(perm.id)}
                          onChange={(e) => togglePermission(perm.id, e.target.checked)}
                        />
                        <div className="flex-grow-1">
                          <label className="form-check-label small" htmlFor={`perm-${perm.id}`}>
                            <code className="small">{perm.slug}</code> — {perm.name}
                            {perm.description && (
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>{perm.description}</div>
                            )}
                          </label>
                        </div>
                        {isPermissionSelected(perm.id) && (
                          <div className="d-flex gap-2">
                            <div className="form-check form-check-inline">
                              <input
                                className="form-check-input"
                                type="radio"
                                name={`effect-${perm.id}`}
                                id={`allow-${perm.id}`}
                                checked={getPermissionEffect(perm.id) === 'allow'}
                                onChange={() => setPermissionEffect(perm.id, 'allow')}
                              />
                              <label className="form-check-label small text-success" htmlFor={`allow-${perm.id}`}>
                                {t('roles.allow')}
                              </label>
                            </div>
                            <div className="form-check form-check-inline">
                              <input
                                className="form-check-input"
                                type="radio"
                                name={`effect-${perm.id}`}
                                id={`deny-${perm.id}`}
                                checked={getPermissionEffect(perm.id) === 'deny'}
                                onChange={() => setPermissionEffect(perm.id, 'deny')}
                              />
                              <label className="form-check-label small text-danger" htmlFor={`deny-${perm.id}`}>
                                {t('roles.deny')}
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </>
          )}

          {/* Ієрархія */}
          {activeTab === 'hierarchy' && (
            <>
              <div className="alert alert-info small mb-3">
                <i className="bi bi-info-circle me-1" />
                {t('roles.hierarchyHint')}
              </div>

              {otherRoles.map(role => (
                <div key={role.id} className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`role-${role.id}`}
                    checked={selectedParents.includes(role.id)}
                    onChange={(e) => setSelectedParents(prev =>
                      e.target.checked ? [...prev, role.id] : prev.filter(id => id !== role.id)
                    )}
                  />
                  <label className="form-check-label" htmlFor={`role-${role.id}`}>
                    <strong>{role.name}</strong>
                    <span className="text-muted small ms-1">({role.slug})</span>
                    {role.description && <div className="text-muted small">{role.description}</div>}
                  </label>
                </div>
              ))}

              {otherRoles.length === 0 && (
                <div className="text-muted small">{t('roles.noOtherRoles')}</div>
              )}
            </>
          )}
        </BaseModal>
      )}
    </>
  )
}
