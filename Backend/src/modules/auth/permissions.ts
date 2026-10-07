export type Role = 'user' | 'admin'
export type Permission = 'events:read' | 'events:manage'
const permissions: Record<Role, readonly Permission[]> = {
  user: ['events:read'],
  admin: ['events:read', 'events:manage'],
}
export function hasPermission(role: Role, permission: Permission) { return permissions[role].includes(permission) }
