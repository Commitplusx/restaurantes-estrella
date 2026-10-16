import { useState } from 'react';
import { OnboardingFlow } from '../components/OnboardingFlow';
export default function WelcomeDesignPreview() {
  const [open, setOpen] = useState(true);
  return <main className="p-8"><h1>Bienvenida de clientes · vista local</h1><p>Vista local para revisar la bienvenida, sin crear pedidos.</p>
    <button className="min-h-11 underline" onClick={() => setOpen(true)}>Volver a ver bienvenida</button>
    {open && <OnboardingFlow onComplete={() => setOpen(false)} />}
  </main>;
}
