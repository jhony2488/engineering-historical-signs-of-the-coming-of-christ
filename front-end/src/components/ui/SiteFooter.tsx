import { EmailSignupForm } from "@/components/newsletter/EmailSignupForm";
import { InstallPwaButton } from "@/components/pwa/InstallPwaButton";

export function SiteFooter() {
  return (
    <footer
      role="contentinfo"
      data-site-footer
      className="site-footer"
      aria-label="Rodapé do site"
    >
      <EmailSignupForm source="footer" compact />

      <InstallPwaButton />

      <p className="site-footer-attribution">
        Engenharia de Sinais Históricos — análise interpretativa, não predição de datas. Feito por{" "}
        <a
          href="https://jhonyaraujo.vercel.app/"
          target="_blank"
          rel="noreferrer"
          className="site-footer-link"
        >
          Jhony Araujo
        </a>
        .
      </p>
    </footer>
  );
}
