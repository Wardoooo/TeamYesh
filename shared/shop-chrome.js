// Shared page footer. The navigation header was removed from all screens.
const footer = document.createElement("footer");
footer.className = "shop-footer";
const name = document.createElement("span");
name.textContent = "Pisonet From Hell";
const team = document.createElement("span");
team.textContent = "Team Yesh";
footer.append(name, team);
document.body.append(footer);
