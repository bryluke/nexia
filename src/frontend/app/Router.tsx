import { useState, useEffect } from "preact/hooks";
import type { ComponentChildren } from "preact";

type Route = "chat" | "dashboard";

function getRoute(): Route {
  const hash = window.location.hash.replace("#/", "").replace("#", "");
  if (hash === "dashboard") return "dashboard";
  return "chat";
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(getRoute);

  useEffect(() => {
    const handler = () => setRoute(getRoute());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const navigate = (to: Route) => {
    window.location.hash = `#/${to}`;
  };

  return { route, navigate };
}
