import { ArrowLeft, ArrowRight, Banknote, Check, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const steps = ['Tu pedido', 'Entrega', 'Pago'];

export function CheckoutHeader({ step, onBack, backDisabled = false }: { step: number; onBack: () => void; backDisabled?: boolean }) {
  return (
    <header className="checkout-header">
      <div className="checkout-header-inner">
        <button type="button" className="checkout-back" onClick={onBack} disabled={backDisabled} aria-label={step > 1 ? 'Volver al paso anterior' : 'Volver al menú'}>
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <a href="/" className="checkout-brand" aria-label="Estrella Eats, inicio">
          <img src="/estrella-circle.png" alt="" width="32" height="32" />
          <span>Estrella<span>Eats</span></span>
        </a>
        <span className="checkout-cash-note"><Banknote size={17} aria-hidden="true" /> Pago en efectivo</span>
      </div>
      <nav className="checkout-progress" aria-label="Progreso de tu pedido">
        <ol>
          {steps.map((label, index) => (
            <li key={label} data-current={step === index + 1} data-complete={step > index + 1} aria-current={step === index + 1 ? 'step' : undefined}>
              <span className="checkout-step-number">
                {step === index + 1 && <motion.span className="checkout-active-step" layoutId="checkout-active-step" transition={{ duration: .32, ease: [.16, 1, .3, 1] }} aria-hidden="true" />}
                <span className="checkout-step-value">{step > index + 1 ? <Check size={13} aria-hidden="true" /> : index + 1}</span>
              </span>
              <span>{label}</span>
            </li>
          ))}
        </ol>
      </nav>
    </header>
  );
}

export function CheckoutAction({ label, onClick, disabled, busy }: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  busy: boolean;
}) {
  return (
    <button type="button" className="checkout-primary" onClick={onClick} disabled={disabled} aria-busy={busy}>
      <span>{label}</span>
      {busy ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <ArrowRight size={20} aria-hidden="true" />}
    </button>
  );
}
