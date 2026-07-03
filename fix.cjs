const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. imports
code = code.replace(
  "import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useAuth, useUser } from '@clerk/clerk-react'",
  "import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useAuth, useUser, SignIn } from '@clerk/clerk-react'"
);

// 2. logout in PublicHeader
code = code.replace(
  "const authUser = useAppStore((state) => state.authUser)\n  const logout = useAppStore((state) => state.logout)",
  "const authUser = useAppStore((state) => state.authUser)"
);

// 3. PricingCard userId
code = code.replace(
  "const { user } = useUser()\n  const { getToken } = useAuth()",
  "const { user } = useUser()\n  const { userId, getToken } = useAuth()"
);

// 4. LoginPage
code = code.replace(
  /function LoginPage\(\) \{[\s\S]*?return \([\s\S]*?<\/section>\n  \)\n\}/,
  `function LoginPage() {
  return (
    <section className="bg-white">
      <div className="flex h-screen items-center justify-center">
        <SignIn routing="path" path="/login" />
      </div>
    </section>
  )
}`
);

// 5. ClientDashboard mock object
code = code.replace(
  "const client = authUser || { studio: 'Studio', events: events.length, photos: 0, searches: 0, storageGb: '0' }",
  "const client: any = authUser || { studioName: 'Studio', events: events.length, photos: 0, searches: 0, storageGb: '0' }"
);

// 6. AdminOverview storage
code = code.replace(
  "value={`${stats.storage} GB`}",
  "value={`${stats.storageGb} GB`}"
);

// 7. AdminOverview onApprove/onReject
code = code.replace(
  "onApprove={() => updateClientStatus(client.id, 'approved')}",
  "onApprove={async () => updateClientStatus((await getToken())!, client.id, 'APPROVED' as any)}"
);
code = code.replace(
  "onReject={() => updateClientStatus(client.id, 'rejected')}",
  "onReject={async () => updateClientStatus((await getToken())!, client.id, 'REJECTED' as any)}"
);
code = code.replace(
  "const updateClientStatus = useAppStore((state) => state.updateClientStatus)",
  "const { getToken } = useAuth()\n  const updateClientStatus = useAppStore((state) => state.updateClientStatus)"
);

// 8. AdminClientsPage unused userId & deleteClient
code = code.replace(
  "const { userId, getToken } = useAuth()\n  const clients = useAppStore((state) => state.clients)\n  const updateClientStatus = useAppStore((state) => state.updateClientStatus)\n  const updateClientSubscription = useAppStore((state) => state.updateClientSubscription)\n  const deleteClient = useAppStore((state) => state.deleteClient)",
  "const { getToken } = useAuth()\n  const clients = useAppStore((state) => state.clients)\n  const updateClientStatus = useAppStore((state) => state.updateClientStatus)\n  const updateClientSubscription = useAppStore((state) => state.updateClientSubscription)"
);

// 9. AdminClientsPage photos formatNumber
code = code.replace(
  "formatNumber(client.photos)",
  "formatNumber(client.photos || 0)"
);

// 10. ClientApprovalRow props
code = code.replace(
  "<h3 className=\"font-semibold tracking-normal\">{client.studio}</h3>\n            <StatusBadge status={client.status} />",
  "<h3 className=\"font-semibold tracking-normal\">{client.studioName}</h3>\n            <StatusBadge status={client.approvalStatus} />"
);

// 11. useAdminStats (unused, remove it completely to fix lines 1440-1450)
code = code.replace(
  /function useAdminStats\([\s\S]*?\],\n  \)\n\}\n/g,
  ""
);

fs.writeFileSync('src/App.tsx', code);
console.log("Successfully updated App.tsx!");
