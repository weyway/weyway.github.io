import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [
  
  Component.Spacer(),
  Component.Search(),
  Component.Darkmode(),
    
  ],
  beforeBody: [],
  afterBody: [],
  left: [
    Component.PageTitle(),
    Component.Explorer({
    title: "Wayfinder",
    folderClickBehavior: "link",
  }),
  Component.MobileOnly(Component.Spacer()),
  ],
  footer: Component.Footer({
    links: {
      "Beyond Love": "https://beyond-love.crd.co/",
      "Discord": "https://discord.gg/4p9fq6PJHf",
    },
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  
  beforeBody: [
    Component.Spacer(),
    Component.Breadcrumbs(),
  ],
  body: [
    Component.Spacer(),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    ],

  right: [
    Component.Spacer(),
    Component.TagList(),
    Component.DesktopOnly(Component.TableOfContents()),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta()],
  right: [],
}
