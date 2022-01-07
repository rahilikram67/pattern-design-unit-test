export function main(
  program: any[],
  commands: any[],
  printer: IPrinter
): void {
  // Prototype Pattern
  var programParser = new ProgramParser();
  var proto = new Prototype(programParser)
  var actualParser = proto.clone();
  var exp_seqs = actualParser.parseProgram(program) // will return as program expressions
  // observer pattern
  var observer = new Observer(printer)
  // visitor pattern
  var visitor = new Visitor()
  var updater = new Updater()
  // singleton pattern
  var single = singleton.getInstance()
  exp_seqs = single.applyCommands(exp_seqs, commands, observer, updater, visitor) // apply commands from json commands array 
  eval(exp_seqs.join(";")) // join array commands with ; and use eval function to solve them   
}


class Prototype {
  proto: ProgramParser
  constructor(proto: ProgramParser) {
    this.proto = proto
  }
  clone() {
    return this.proto
  }
}
class ProgramParser {
  parseProgram(program: any[]): string[] {
    var exp_seqs = []
    var operator: any = { add: "+", sub: "-", mul: "*", div: "/", plus: "+", multi: "*", mult: "*" }
    for (var el of program) {

      if (el.kind.toLowerCase() == "watch") {
        // below expression will assign watch function a target variable
        let expression = `${el.variable.kind.toLowerCase()} ${el.variable.name} = watch('${el.file.name}')`
        exp_seqs.push(expression)
      }
      else if (el.kind.toLowerCase() == "simple") {
        // below expression will assign simple arthematic expression based on left(operand) (operator) right(operand) a target variable

        var expression = ''
        for (var v in el.expression) {
          if (v.toLowerCase() == "kind") continue
          else {
            let expr = (el.expression[v].name) ? el.expression[v].name : el.expression[v].value
            if (expression == '') {
              expression = `${el.variable.kind.toLowerCase()} ${el.variable.name} = ${expr}`
            }
            else expression += `${operator[el.expression.kind.toLowerCase()]} ${expr}`
          }
          //${operator[el.expression.kind.toLowerCase()]} ${rightNameValue}
        }

        exp_seqs.push(expression)
      }
      else if (el.kind.toLowerCase() == "cond") {
        // below expression will assign conditional expression based on left(operand) (operator) right(operand) a target variable
        let leftNameValue = (el.trueExp.left.name) ? el.trueExp.left.name : el.trueExp.left.value
        let rightNameValue = (el.trueExp.right.name) ? el.trueExp.right.name : el.trueExp.right.value
        let trueExp = `${leftNameValue}${operator[el.trueExp.kind.toLowerCase()]}${rightNameValue}`
        let falseExp = `${el.falseExp.name}`
        let expression = `${el.variable.kind.toLowerCase()} ${el.variable.name} = (${el.guard.name}) ? ${trueExp} : ${falseExp}`
        exp_seqs.push(expression)
      }
    }
    return exp_seqs
  }
}




class singleton {
  private static instance: singleton;
  private constructor() { }
  public static getInstance() {
    if (!singleton.instance) {
      singleton.instance = new singleton();
    }
    return singleton.instance;
  }
  applyCommands(exps: string[], commands: any[], observer: Observer, updater: Updater, visitor: Visitor): string[] {
    for (var el of commands) {
      if (el.kind.toLowerCase() == "monitor") {
        // below expression will insert printer function to the array of expressions
        var regex_after = new RegExp(`\\b${el.name}\\b[\\s]*=`, "g")
        var regex_before = new RegExp(`var \\b${el.name}\\b[\\s]*=`, "g")
        exps.map((val, index, arr) => {
          if (val.match(regex_before)) {
            // arr.splice(index + 1, 0, `observer.subscribe('${el.name}')`)
            arr.splice(index + 1, 0, `observer.fire({var:'${el.name}',val:${el.name}})`)
          }
          else if (val.match(regex_after)) {
            arr.splice(index + 1, 0, `observer.fire({var:'${el.name}',val:${el.name}})`)
          }
        })
      }
      else if (el.kind.toLowerCase() == "update") {
        // below expression will update target variables with new values
        // we are using visitor pattern to update target variables
        exps.map((val, index, arr) => {
          if (val.includes(el.name)) {
            updater.str = val
            updater.repl = (el.name.includes('/var/')) ? `watch('${el.name}')` : el.name
            updater.newStr = el.value
            updater.accept(visitor)
            arr.splice(index, 1, updater.str)
          }
        })
      }
    }
    // remove all remaining watch statements with incremental updates 
    var margin = 1
    for (var i = 0; i < exps.length; i++) {
      if (exps[i].includes("watch")) {
        exps[i] = exps[i].replace(/watch\('[\/a-zA-Z0-9]*'\)/g, `${margin}`)
        margin += 2
      }
    }
    return exps
  }
}



class Observer {
  private printer: IPrinter
  private subscribers: any[] = []
  constructor(printer: IPrinter) {
    this.printer = printer
  }
  subscribe(subscriber: any) {
    this.subscribers.push(subscriber)
  }
  unsubscribe(subscriber: any) {
    this.subscribers.splice(this.subscribers.indexOf(subscriber), 1)
  }
  fire(msg: { var: string, val: number }) {
    this.printer.log(msg)
  }
}

//visitor pattern
class Updater {
  private value: string
  private replace: string
  private newString: string
  get str() {
    return this.value
  }
  set str(value) {
    this.value = value
  }
  get repl() {
    return this.replace
  }
  set repl(value) {
    this.replace = value
  }
  get newStr() {
    return this.newString
  }
  set newStr(value) {
    this.newString = value
  }
  accept(visitor: Visitor) {
    visitor.visit(this)
  }
  update() {
    this.str = this.str.replace(this.repl, this.newStr)
  }
}

class Visitor {
  visit(updater: Updater) {
    updater.update()
  }
}

export interface IPrinter {
  log(msg: { var: string; val: number }): void;
  last(name: string): number;
}
