export function csvCell(value:string|number){const raw=typeof value==='number'?String(value):(/^[\s\uFEFF]*[=+@-]|^[\t\r\n]/.test(value)?"'"+value:value);return '"'+raw.replaceAll('"','""')+'"';}
export function csv(rows:(string|number)[][]){return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';}
