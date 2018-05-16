class Diff {
  constructor (kind, path) {
    this.kind = kind
    this.path = path
  }
}
class DiffEdit extends Diff {
  constructor (path, origin, value) {
    super('E', path)
    this.lhs = origin
    this.rhs = value
  }
}

class DiffNew extends Diff {
  constructor (path, value) {
    super('N', path)
    this.rhs = value
  }
}

class DiffDeleted extends Diff {
  constructor (path, value) {
    super('D', path)
    this.lhs = value
  }
}

class DiffArray extends Diff {
  constructor (path, index, item) {
    super('A', path)
    this.index = index
    this.item = item
  }
}

class DeepDiff {
  realTypeOf = (subject) => {
    var type = typeof subject
    if (type !== 'object') {
      return type
    }
  
    if (subject === Math) {
      return 'math'
    } else if (subject === null) {
      return 'null'
    } else if (Array.isArray(subject)) {
      return 'array'
    } else if (Object.prototype.toString.call(subject) === '[object Date]') {
      return 'date'
    } else if (typeof subject.toString === 'function' && /^\/.*\//.test(subject.toString())) {
      return 'regexp'
    }
    return 'object'
  }
  arrayRemove = (arr, from, to) => {
    var rest = arr.slice((to || from) + 1 || arr.length)
    arr.length = from < 0 ? arr.length + from : from
    arr.push.apply(arr, rest)
    return arr
  }
  deepDiff = (lhs, rhs, changes, path, key, stack = []) => {
    const currentPath = !!path && !!key
      ? `${path}.${key}`
      : `${path || ''}${path ? '.' + key || '' : key || '' }`
    const ltype = typeof lhs
    const rtype = typeof rhs
  
    const ldefined = ltype !== 'undefined' || (stack && stack[stack.length - 1].lhs && stack[stack.length - 1].lhs.hasOwnProperty(key))
    const rdefined = rtype !== 'undefined' || (stack && stack[stack.length - 1].rhs && stack[stack.length - 1].rhs.hasOwnProperty(key))

    if (!ldefined && rdefined) {
      changes(new DiffNew(currentPath, rhs))
    } else if (!rdefined && ldefined) {
      changes(new DiffDeleted(currentPath, lhs))
    } else if (this.realTypeOf(lhs) !== this.realTypeOf(rhs)) {
      changes(new DiffEdit(currentPath, lhs, rhs))
    } else if (ltype === 'object' && lhs !== null && rhs !== null) {
      const stackHasLhs = stack.filter((stackItem) => stackItem.lhs === lhs).length
      if (!stackHasLhs) {
        stack.push({ lhs: lhs, rhs: rhs })
        if (Array.isArray(lhs)) {
          var i, len = lhs.length
          for (i = 0; i < lhs.length; i++) {
            if (i >= rhs.length) {
              changes(new DiffArray(currentPath, i, new DiffDeleted(undefined, lhs[i])))
            } else {
              this.deepDiff(lhs[i], rhs[i], changes, currentPath, i, stack)
            }
          }
          while (i < rhs.length) {
            changes(new DiffArray(currentPath, i, new DiffNew(undefined, rhs[i++])))
          }
        } else {
          var akeys = Object.keys(lhs)
          var pkeys = Object.keys(rhs)
          akeys.forEach((k, i) => {
            var other = pkeys.indexOf(k)
            if (other >= 0) {
              this.deepDiff(lhs[k], rhs[k], changes, currentPath, k, stack)
              pkeys = this.arrayRemove(pkeys, other)
            } else {
              this.deepDiff(lhs[k], undefined, changes, currentPath, k, stack)
            }
          })
          pkeys.forEach((k) => {
            this.deepDiff(undefined, rhs[k], changes, currentPath, k, stack)
          })
        }
        stack.length = stack.length - 1
      } else if (lhs !== rhs) {
        // lhs is contains a cycle at this element and it differs from rhs
        changes(new DiffEdit(currentPath, lhs, rhs))
      }
    } else if (lhs !== rhs) {
      if (!(ltype === 'number' && isNaN(lhs) && isNaN(rhs))) {
        changes(new DiffEdit(currentPath, lhs, rhs))
      }
    }
  }
  diff = (lhs, rhs) => {
    const differences = []
    this.deepDiff(lhs, rhs, (diff) => diff && differences.push(diff))
    return differences
  }
}

export default new DeepDiff()
