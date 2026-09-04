(function () {
  const nav = document.querySelector('[data-flowpage-nav]');
  if (!nav) return;
  const project = document.documentElement.dataset.flowpageProject || document.body.dataset.flowpageProject;
  nav.querySelectorAll('[data-project]').forEach(link => {
    if (link.dataset.project === project) link.classList.add('is-active');
  });
})();
