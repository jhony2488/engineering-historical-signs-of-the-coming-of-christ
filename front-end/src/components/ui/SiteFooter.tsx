export function SiteFooter() {
  return (
    <footer
      role="contentinfo"
      data-site-footer
      className="site-footer"
      aria-label="Rodapé do site"
    >
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
    </footer>
  );
}