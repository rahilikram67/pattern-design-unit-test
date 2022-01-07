var el ="watch('/var/s1')"
el = el.replace(/watch\('[\/a-zA-Z0-9]*'\)/g, "0")
console.log(el)