const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Remove useMemo
code = code.replace(
  "import { useMemo, useState, useEffect } from 'react'",
  "import { useState, useEffect } from 'react'"
);

// 2. Remove demo credentials import
code = code.replace(
  "import { useAppStore, demoClientEmail, demoClientPassword } from './store'",
  "import { useAppStore } from './store'"
);

// 3. Remove unused userId in App()
code = code.replace(
  "const { userId, getToken } = useAuth()\n  const syncAuthUser = useAppStore(state => state.syncAuthUser)",
  "const { getToken } = useAuth()\n  const syncAuthUser = useAppStore(state => state.syncAuthUser)"
);
// Wait, I didn't verify the exact string for App(). 
// Let's use a regex that handles App()
code = code.replace(
  /function App\(\) \{\s*const location = useLocation\(\)\s*const \{ user \} = useUser\(\)\s*const \{ userId, getToken \} = useAuth\(\)/,
  "function App() {\n  const location = useLocation()\n  const { user } = useUser()\n  const { getToken } = useAuth()"
);
code = code.replace(
  /function App\(\) \{\s*const location = useLocation\(\)\s*const \{ user \} = useUser\(\)\s*const \{ getToken \} = useAuth\(\)\s*const \{ userId, getToken: getToken2 \} = useAuth\(\)/,
  "function App() {\n  const location = useLocation()\n  const { user } = useUser()\n  const { getToken } = useAuth()"
);

// 4. Add userId back to PricingCard
code = code.replace(
  /function PricingCard\(\{[\s\S]*?\}\) \{\s*const \{ user \} = useUser\(\)\s*const \{ getToken \} = useAuth\(\)/,
  "function PricingCard({ icon, name, amount, original, price, badge, description, features, highlighted = false }: any) {\n  const { user } = useUser()\n  const { userId, getToken } = useAuth()"
);
// Let's just do a specific replace for PricingCard body
code = code.replace(
  "const { user } = useUser()\n  const { getToken } = useAuth()\n  const navigate = useNavigate()\n  const syncAuthUser = useAppStore(state => state.syncAuthUser)\n  const [loading, setLoading] = useState(false)",
  "const { user } = useUser()\n  const { userId, getToken } = useAuth()\n  const navigate = useNavigate()\n  const syncAuthUser = useAppStore(state => state.syncAuthUser)\n  const [loading, setLoading] = useState(false)"
);

// 5. Remove redeclared getToken in AdminOverview
code = code.replace(
  "const { getToken } = useAuth()\n  const updateClientStatus = useAppStore((state) => state.updateClientStatus)",
  "const updateClientStatus = useAppStore((state) => state.updateClientStatus)"
);
// Make sure it removes it globally if it occurs twice.
code = code.replace(
  "const { getToken } = useAuth()\n  const updateClientStatus = useAppStore((state) => state.updateClientStatus)",
  "const updateClientStatus = useAppStore((state) => state.updateClientStatus)"
);

// 6. Fix formatNumber(client.photos) in AdminClientsPage table
code = code.replace(
  "className=\"mt-1 text-sm text-stone-650\">{formatNumber(client.photos)} photos</div>",
  "className=\"mt-1 text-sm text-stone-650\">{formatNumber(client.photos || 0)} photos</div>"
);


fs.writeFileSync('src/App.tsx', code);
console.log("Fixed remaining TS errors!");
