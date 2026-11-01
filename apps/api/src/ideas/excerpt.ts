export function ideaExcerpt(description: string) {
  return description
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_`>~]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}
