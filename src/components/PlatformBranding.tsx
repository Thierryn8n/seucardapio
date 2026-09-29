import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";

export function PlatformBranding() {
  const { data } = useQuery({
    queryKey: ["platform-branding"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () =>
      (await db.from("settings").select("company_name, favicon_url").is("user_id", null).limit(1).maybeSingle()).data,
  });

  useEffect(() => {
    if (!data?.favicon_url) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = data.favicon_url;
  }, [data?.favicon_url]);

  return null;
}
