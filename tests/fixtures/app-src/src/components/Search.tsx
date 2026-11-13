import useSWR from "swr";

export function Search({ q }: { q: string }) {
  const { data } = useSWR("/api/search?q=" + q);
  return <ul>{(data ?? []).map((r: { id: string; name: string }) => <li key={r.id}>{r.name}</li>)}</ul>;
}
