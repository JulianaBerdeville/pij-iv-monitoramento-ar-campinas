import { useEffect, useState } from "react";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** Busca um arquivo JSON estatico servido em /data (gerado pelo pipeline Python). */
export function useJson<T>(path: string): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelado = false;
    fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error(`Falha ao carregar ${path} (HTTP ${res.status})`);
        return res.json() as Promise<T>;
      })
      .then((data) => {
        if (!cancelado) setState({ data, loading: false, error: null });
      })
      .catch((err: Error) => {
        if (!cancelado) setState({ data: null, loading: false, error: err.message });
      });
    return () => {
      cancelado = true;
    };
  }, [path]);

  return state;
}
