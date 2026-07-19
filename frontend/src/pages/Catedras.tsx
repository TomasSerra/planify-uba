import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ChevronRight, MessageSquarePlus, Search } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { Pagination } from "@/components/ui/pagination";
import { StarRating } from "@/components/StarRating";
import { ReviewDialog } from "@/components/ReviewDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useCareer } from "@/lib/career";
import { cn } from "@/lib/utils";
import type { CatedraRankItem, ReviewSort } from "@/lib/types";

const SORT_OPTIONS: { value: ReviewSort; label: string }[] = [
  { value: "mejores", label: "Mejor puntuadas" },
  { value: "mas_resenas", label: "Más reseñas" },
  { value: "peores", label: "Peor puntuadas" },
  { value: "materia", label: "Materia (A-Z)" },
];

function catedraLabel(item: CatedraRankItem): string {
  const base = `Cátedra ${item.numero ?? item.catedra_id}`;
  return item.titular ? `${base} · ${item.titular}` : base;
}

function RankCard({ item }: { item: CatedraRankItem }) {
  return (
    <Link to={`/catedras/${item.catedra_id}`} className="block">
      <Card className="transition-colors hover:border-primary/40 hover:bg-accent/40">
        <CardContent className="flex items-center gap-3 p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.materia_nombre}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {catedraLabel(item)}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            {item.review_count > 0 ? (
              <>
                <div className="flex items-center gap-1">
                  <StarRating value={item.avg_rating ?? 0} size={13} />
                  <span className="text-xs font-semibold">
                    {item.avg_rating?.toFixed(1)}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {item.review_count}{" "}
                  {item.review_count === 1 ? "reseña" : "reseñas"}
                </span>
              </>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                Sin reseñas
              </span>
            )}
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}

export function Catedras() {
  const { carrera } = useCareer();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<ReviewSort>("mejores");
  const [page, setPage] = useState(1);
  const [reviewOpen, setReviewOpen] = useState(false);

  // Debounce de la búsqueda: no pegamos al BE en cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setQ(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Cualquier cambio de filtro/orden vuelve a la página 1.
  useEffect(() => {
    setPage(1);
  }, [q, sort, carrera]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["catedras-rank", carrera, q, sort, page],
    queryFn: () =>
      api.listCatedraRankings({
        carrera: carrera as string,
        q: q || undefined,
        sort,
        page,
      }),
    enabled: !!carrera,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const totalPages = useMemo(
    () => (data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 0),
    [data]
  );

  const showSkeleton = !carrera || (isLoading && !data);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-6xl space-y-6 px-4 pb-8 pt-8 sm:px-6">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Recomendaciones
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Reseñas de la comunidad. Buscá una cátedra antes de anotarte o
              dejá la tuya.
            </p>
          </div>
          <Button
            className="w-full shrink-0 sm:w-auto"
            onClick={() => setReviewOpen(true)}
          >
            <MessageSquarePlus className="size-4" />
            Dejar reseña
          </Button>
        </div>

        {/* Toolbar: búsqueda + orden */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por materia, cátedra o titular…"
              className="pl-9"
              aria-label="Buscar cátedras"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as ReviewSort)}>
            <SelectTrigger className="sm:w-52" aria-label="Ordenar">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showSkeleton && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 14 }).map((_, i) => (
              <Skeleton key={i} className="h-[64px] w-full rounded-2xl" />
            ))}
          </div>
        )}

        {!showSkeleton && isError && (
          <Card>
            <CardContent className="py-6">
              <ErrorState
                title="No pudimos cargar las cátedras"
                description="Revisá tu conexión y volvé a intentar."
                onRetry={() => refetch()}
                retrying={isFetching}
              />
            </CardContent>
          </Card>
        )}

        {!showSkeleton && !isError && data && (
          <>
            {data.items.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
                  <Search className="mb-1 size-8 text-muted-foreground/50" />
                  {q
                    ? "No encontramos cátedras para tu búsqueda."
                    : "Todavía no hay cátedras para tu carrera."}
                </CardContent>
              </Card>
            ) : (
              <div
                className={cn(
                  "grid grid-cols-1 gap-3 transition-opacity sm:grid-cols-2",
                  isFetching && "opacity-60"
                )}
              >
                {data.items.map((item) => (
                  <RankCard key={item.catedra_id} item={item} />
                ))}
              </div>
            )}

            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </>
        )}
      </main>

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["catedras-rank"] });
        }}
      />
    </div>
  );
}
