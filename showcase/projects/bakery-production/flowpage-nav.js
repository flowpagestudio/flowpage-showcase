/*
 * The FlowPage Studio URLs are already set below. Update only if a project address changes.
 * Set data-flowpage-project on the <body> element to: computer, pedicure or baking.
 */
window.FlowPageNavigation = {
  homeUrl: "https://flowpagestudio.github.io/flowpage-showcase/showcase/",
  computerUrl: "https://flowpagestudio.github.io/flowpage-showcase/showcase/projects/technician/",
  pedicureUrl: "https://flowpagestudio.github.io/flowpage-showcase/showcase/projects/pedicure-manicure/",
  bakingUrl: "https://flowpagestudio.github.io/flowpage-showcase/showcase/projects/bakery-production/",
  assetBaseUrl: "https://raw.githubusercontent.com/flowpagestudio/flowpage-assets/main/flowpage-navigation",
  infoText: "מערכות לדוגמה: אתר שירות, תהליך תפעולי וחיבור לכלי Google."
};

document.addEventListener("DOMContentLoaded", function () {
  var config = window.FlowPageNavigation;
  var activeProject = document.body.dataset.flowpageProject || "";
  var root = document.createElement("nav");
  root.className = "flowpage-nav";
  root.setAttribute("aria-label", "FlowPage Studio projects");

  var projects = [
    { id: "computer", label: "Computer Flow", url: config.computerUrl, icon: config.assetBaseUrl + "/computer-flow.png" },
    { id: "pedicure", label: "Pedicure Flow", url: config.pedicureUrl, icon: config.assetBaseUrl + "/pedicure-flow.png" },
    { id: "baking", label: "Baking Flow", url: config.bakingUrl, icon: config.assetBaseUrl + "/baking-flow.png" }
  ];

  root.innerHTML =
    '<a class="flowpage-nav__brand" href="' + config.homeUrl + '">FlowPage <span>Studio</span></a>' +
    '<div class="flowpage-nav__links">' + projects.map(function (project) {
      var current = project.id === activeProject ? ' aria-current="page"' : "";
      return '<a class="flowpage-nav__item" href="' + project.url + '"' + current + '>' +
        '<img class="flowpage-nav__icon" src="' + project.icon + '" alt="" aria-hidden="true">' + project.label + '</a>';
    }).join("") + '</div>' +
    '<button class="flowpage-nav__info" type="button" aria-label="איך זה עובד">איך זה עובד</button>';

  root.querySelector(".flowpage-nav__info").addEventListener("click", function () {
    window.alert(config.infoText);
  });
  document.body.prepend(root);
});
