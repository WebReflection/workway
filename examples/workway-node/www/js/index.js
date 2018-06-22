workway('node://os.js').then(async ({worker, namespace:os}) => {
  // cpus are not going to change (not the showed part)
  const cpus = await os.cpus();
  // grab other info and render the view
  grabAndShow();
  function grabAndShow() {
    Promise.all([
      os.freemem(),
      os.totalmem()
    ]).then(render);
  }
  // show all the details
  function render([freemem, totalmem]) {
    hyperHTML(document.body)`
    <strong>Summary of ${cpus.length}
            CPU${cpus.length === 1 ? '' : 's'}</strong>
    <ul>
      ${cpus.map(cpu => hyperHTML(cpu)`
      <li>${cpu.model}</li>`)}
    </ul>
    <hr>
    <p>Using ${
      ((100 * (totalmem - freemem)) / totalmem).toFixed(2)
    }% of memory</p>`;
    // update the same view in a second
    setTimeout(grabAndShow, 1000);
  }
});