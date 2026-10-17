"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

type Img = { id: string; altText: string | null };

export function Gallery({
  images,
  title,
  labels,
}: {
  images: Img[];
  title: string;
  labels: { photoOf: string; noPhotos: string };
}) {
  const [index, setIndex] = useState(0);
  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-2xl bg-navy-100 text-navy-500">
        {labels.noPhotos}
      </div>
    );
  }
  const current = images[index]!;
  const go = (d: number) => setIndex((i) => (i + d + images.length) % images.length);
  const caption = labels.photoOf.replace("{n}", String(index + 1)).replace("{total}", String(images.length));
  return (
    <div aria-roledescription="carousel" aria-label={title}>
      <div className="relative overflow-hidden rounded-2xl bg-navy-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/media/${current.id}`}
          alt={current.altText ?? `${title} — ${caption}`}
          fetchPriority="high"
          className="aspect-[16/10] max-h-[70svh] w-full object-contain"
        />
        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow"
              aria-label="Next photo"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
            <p
              className="absolute right-3 bottom-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white"
              aria-live="polite"
            >
              {caption}
            </p>
          </>
        ) : null}
      </div>
      {images.length > 1 ? (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${i === index ? "border-brand-500" : "border-transparent"}`}
              aria-label={labels.photoOf
                .replace("{n}", String(i + 1))
                .replace("{total}", String(images.length))}
              aria-current={i === index}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/media/${img.id}?size=thumb`}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
