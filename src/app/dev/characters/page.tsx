import { notFound } from "next/navigation";
import { CharacterGallery, type GallerySection } from "@/characters/CharacterGallery";

export const dynamic = "force-dynamic";

const SECTIONS: GallerySection[] = ["play", "grid", "sizes", "cosmetics", "sounds"];

/**
 * Development gallery for the cast: every expression, sizes, cosmetics,
 * reactions and sounds. `?animate=0` renders static art; `?only=<section>`
 * shows one section. Not available in production.
 */
export default async function CharactersDevPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  const only = SECTIONS.find((s) => s === params.only);
  return <CharacterGallery animate={params.animate !== "0"} only={only} />;
}
