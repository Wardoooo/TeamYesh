const root = new URL("../", import.meta.url);
const current = location.pathname;

function link(path, label) {
  const anchor = document.createElement("a");
  anchor.href = new URL(path, root);
  anchor.textContent = label;
  if (anchor.pathname === current || (path === "index.html" && current === root.pathname)) {
    anchor.setAttribute("aria-current", "page");
  }
  return anchor;
}

const header = document.createElement("header");
header.className = "shop-header";
const brand = link("index.html", "Dayex Sari-Sari Store");
brand.className = "shop-brand";
const nav = document.createElement("nav");
nav.setAttribute("aria-label", "Store navigation");
nav.append(link("index.html", "Store"), link("pages/guide.html", "How to play"), link("pages/about.html", "About"));
header.append(brand, nav);
document.body.prepend(header);

const footer = document.createElement("footer");
footer.className = "shop-footer";
const name = document.createElement("span");
name.textContent = "Pisonet From Hell";
const team = document.createElement("span");
team.textContent = "Team Yesh";
footer.append(name, team);
document.body.append(footer);
