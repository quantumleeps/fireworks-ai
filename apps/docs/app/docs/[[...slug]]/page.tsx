import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { notFound } from "next/navigation";
import type { ImgHTMLAttributes, VideoHTMLAttributes } from "react";
import { source } from "@/app/lib/source";

const basePath = "/neeter";

function prefixSrc(rawSrc: unknown) {
  return typeof rawSrc === "string" && rawSrc.startsWith("/")
    ? `${basePath}${rawSrc}`
    : (rawSrc as string | undefined);
}

function Img(props: ImgHTMLAttributes<HTMLImageElement>) {
  const { src: rawSrc, ...rest } = props;
  // biome-ignore lint/a11y/useAltText: alt passed via rest from MDX
  // biome-ignore lint/performance/noImgElement: static export, no next/image
  return <img {...rest} src={prefixSrc(rawSrc)} />;
}

function Video(props: VideoHTMLAttributes<HTMLVideoElement>) {
  const { src: rawSrc, ...rest } = props;
  return <video {...rest} src={prefixSrc(rawSrc)} />;
}

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={{ ...defaultMdxComponents, img: Img, Img, Video }} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}
