import { NextResponse, type NextRequest } from "next/server";
 
// Volontairement neutre : l'espace admin gère lui-même la connexion côté client
// (aucune redirection serveur), ce qui évite tout problème de session/redirection.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}
 
export const config = {
  // Ne s'applique à rien d'utile — le middleware est neutre.
  matcher: ["/_middleware_noop_"],
};
 
