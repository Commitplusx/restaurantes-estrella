export function restaurantLoginEmail(identity: string): string | null {
  const value=identity.trim()
  if (value.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value.toLowerCase() : null
  const phone=value.replace(/\D/g,'').replace(/^52(?=\d{10}$)/,'')
  return /^\d{10}$/.test(phone) ? `aliado_${phone}@app-estrella.shop` : null
}
export type BranchCredentials = { branchId: string; phone: string; status: 'exists' } | { branchId: string; phone: string; status: 'generated'; password: string }
export function parseBranchCredentials(value: unknown,branchId: string): BranchCredentials {
  if (typeof value !== 'object' || value === null || !('phone' in value) || typeof value.phone!=='string' || !/^\d{10}$/.test(value.phone) || !('status' in value)) {
    throw new Error('El servidor no confirmó los datos de acceso.')
  }
  if (value.status==='exists') return {branchId,phone:value.phone,status:'exists'}
  if (value.status==='generated' && 'password' in value && typeof value.password==='string' && value.password.length>=20 && value.password.length<=128) {
    return {branchId,phone:value.phone,status:'generated',password:value.password}
  }
  throw new Error('El servidor no confirmó la contraseña. Revisa el acceso de la sucursal.')
}
