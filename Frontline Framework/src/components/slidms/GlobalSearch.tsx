import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { FileText, Loader2, Scale, Search, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { searchService, type SearchResultItem } from "@/services/slidms";
import { withFallback } from "@/services/api";

function HighlightSnippet({ text }: { text: string }) {
  if (!text) return null;
  // Splits text on <<...>> markers
  const parts = text.split(/(<<[^>]+>>)/g);
  return (
    <span className="line-clamp-2 text-[11px] text-muted-foreground leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith("<<") && part.endsWith(">>")) {
          return (
            <mark
              key={i}
              className="rounded bg-primary/25 px-0.5 font-medium text-primary-foreground"
            >
              {part.slice(2, -2)}
            </mark>
          );
        }
        return part;
      })}
    </span>
  );
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Debounce query input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 180);
    return () => clearTimeout(handler);
  }, [query]);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Click outside to close
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["global-search", debouncedQuery],
    enabled: debouncedQuery.length >= 2,
    queryFn: () => withFallback(() => searchService.query(debouncedQuery, 10), { query: debouncedQuery, items: [] }),
    staleTime: 10_000,
  });

  const results: SearchResultItem[] = data?.data?.items ?? [];

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[selectedIndex];
      if (item) {
        setIsOpen(false);
        if (item.type === "case") {
          navigate({ to: "/cases/$id", params: { id: item.id } });
        } else {
          navigate({ to: "/documents/$docId", params: { docId: item.id } });
        }
      }
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-[340px]">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle"
          aria-hidden="true"
        />
        <label htmlFor="global-search" className="sr-only">
          Search cases, documents, FIRs
        </label>
        <input
          ref={inputRef}
          id="global-search"
          type="search"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search cases, documents, FIRs... (Ctrl+K)"
          className="h-9 w-full rounded-lg border border-input bg-background-raised pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setDebouncedQuery("");
              setIsOpen(false);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-background-deep px-1.5 py-0.5 font-mono text-[9px] font-semibold text-muted-foreground xl:inline-block">
            ⌘K
          </kbd>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-[420px] overflow-y-auto rounded-xl border border-border bg-card/95 p-2 shadow-2xl backdrop-blur-md animate-in fade-in-50 zoom-in-95">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              Searching system records...
            </div>
          ) : results.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No matching cases or documents found for <span className="font-semibold text-foreground">"{query}"</span>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Search Results ({results.length})
              </p>
              {results.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const isCase = item.type === "case";
                return (
                  <Link
                    key={`${item.type}-${item.id}`}
                    to={isCase ? "/cases/$id" : "/documents/$docId"}
                    params={isCase ? { id: item.id } : { docId: item.id }}
                    onClick={() => setIsOpen(false)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-start gap-2.5 rounded-lg p-2 transition-colors ${
                      isSelected
                        ? "border border-primary/40 bg-primary/12 text-foreground"
                        : "hover:bg-background-raised text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border ${
                        isCase
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-chain/40 bg-chain/10 text-chain"
                      }`}
                    >
                      {isCase ? <Scale className="size-3.5" /> : <FileText className="size-3.5" />}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold text-foreground">{item.title}</p>
                        <span className="shrink-0 rounded bg-background-raised px-1.5 py-0.5 font-mono text-[9px] font-medium text-primary">
                          {item.firNumber || item.type.toUpperCase()}
                        </span>
                      </div>
                      {item.snippet ? (
                        <div className="mt-0.5">
                          <HighlightSnippet text={item.snippet} />
                        </div>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
