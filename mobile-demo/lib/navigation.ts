// Lets the browser versions of the server actions change page, the way redirect() does on the server.

type Router = { push(href: string): void; replace(href: string): void };

let router: Router | null = null;

export function setRouter(r: Router) {
  router = r;
}

export function navigate(href: string, { replace = false } = {}) {
  if (router) {
    if (replace) router.replace(href);
    else router.push(href);
    return;
  }
  // Not mounted yet: a plain page load. Paths here are inside the demo, so add the base path.
  const url = `${process.env.DEMO_BASE_PATH ?? ""}${href}`;
  if (replace) window.location.replace(url);
  else window.location.assign(url);
}
