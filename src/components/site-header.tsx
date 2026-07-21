import Link from "next/link";
import Image from "next/image";

export function SiteHeader() {
  return (
    <header className="siteHeader">
      <div className="navInner">
        <Link className="brand" href="/" aria-label="SIES, inicio"><Image src="/brand/logo-desnu.png" alt="Ministerio de Educación, Dirección de Educación Superior No Universitaria, Gobierno de Tucumán" width={2048} height={536} priority /></Link>
        <nav aria-label="Navegación principal">
          <Link href="/instituciones">Instituciones</Link>
          <Link href="/mapa">Mapa</Link>
          <Link href="/ofertas">Ofertas</Link>
          <Link href="/autoridades">Autoridades</Link>
          <Link href="/listados">Listados</Link>
        </nav>
      </div>
    </header>
  );
}
