// TODO Fase 0: Accept invitation page
// Flow: validate token dari invitations table → belum expired + belum accepted
// → tampilkan form register (nama, password) → buat user + employee record
// → set invitations.acceptedAt → redirect ke login
export default function InvitePage() {
  return (
    <div className="w-full max-w-md rounded-lg bg-white p-8 shadow">
      <h1 className="mb-2 text-2xl font-bold">Terima Undangan</h1>
      <p className="text-gray-500">Invitation form — coming in Fase 0</p>
    </div>
  )
}
