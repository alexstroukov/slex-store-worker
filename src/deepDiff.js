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
  deepDiff = (lhs, rhs, changes, prefilter, path, key, stack) => {
    path = path || []
    stack = stack || []
    var currentPath = path.slice(0)
    if (typeof key !== 'undefined') {
      if (prefilter) {
        if (typeof(prefilter) === 'function' && prefilter(currentPath, key)) {
          return
        } else if (typeof(prefilter) === 'object') {
          if (prefilter.prefilter && prefilter.prefilter(currentPath, key)) {
            return
          }
          if (prefilter.normalize) {
            var alt = prefilter.normalize(currentPath, key, lhs, rhs)
            if (alt) {
              lhs = alt[0]
              rhs = alt[1]
            }
          }
        }
      }
      currentPath.push(key)
    }
  
    // Use string comparison for regexes
    if (this.realTypeOf(lhs) === 'regexp' && this.realTypeOf(rhs) === 'regexp') {
      lhs = lhs.toString();
      rhs = rhs.toString();
    }
  
    var ltype = typeof lhs
    var rtype = typeof rhs
  
    var ldefined = ltype !== 'undefined' || (stack && stack[stack.length - 1].lhs && stack[stack.length - 1].lhs.hasOwnProperty(key))
    var rdefined = rtype !== 'undefined' || (stack && stack[stack.length - 1].rhs && stack[stack.length - 1].rhs.hasOwnProperty(key))
  
    if (!ldefined && rdefined) {
      changes(new DiffNew(currentPath, rhs))
    } else if (!rdefined && ldefined) {
      changes(new DiffDeleted(currentPath, lhs))
    } else if (this.realTypeOf(lhs) !== this.realTypeOf(rhs)) {
      changes(new DiffEdit(currentPath, lhs, rhs))
    } else if (this.realTypeOf(lhs) === 'date' && (lhs - rhs) !== 0) {
      changes(new DiffEdit(currentPath, lhs, rhs))
    } else if (ltype === 'object' && lhs !== null && rhs !== null) {
      if (!stack.filter((x) => {
          return x.lhs === lhs; }).length) {
        stack.push({ lhs: lhs, rhs: rhs });
        if (Array.isArray(lhs)) {
          var i, len = lhs.length;
          for (i = 0; i < lhs.length; i++) {
            if (i >= rhs.length) {
              changes(new DiffArray(currentPath, i, new DiffDeleted(undefined, lhs[i])));
            } else {
              this.deepDiff(lhs[i], rhs[i], changes, prefilter, currentPath, i, stack);
            }
          }
          while (i < rhs.length) {
            changes(new DiffArray(currentPath, i, new DiffNew(undefined, rhs[i++])));
          }
        } else {
          var akeys = Object.keys(lhs)
          var pkeys = Object.keys(rhs)
          akeys.forEach((k, i) => {
            var other = pkeys.indexOf(k)
            if (other >= 0) {
              this.deepDiff(lhs[k], rhs[k], changes, prefilter, currentPath, k, stack)
              pkeys = this.arrayRemove(pkeys, other)
            } else {
              this.deepDiff(lhs[k], undefined, changes, prefilter, currentPath, k, stack)
            }
          })
          pkeys.forEach((k) => {
            this.deepDiff(undefined, rhs[k], changes, prefilter, currentPath, k, stack)
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
  diff = (lhs, rhs, prefilter, accum) => {
    accum = accum || []
    this.deepDiff(lhs, rhs, (diff) => {
      if (diff) {
        accum.push(diff)
      }
    }, prefilter)
    return (accum.length) ? accum : undefined
  }
}

export default new DeepDiff()
