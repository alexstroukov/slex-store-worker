class DeepDiff {
  createDiffEdit = (path, origin, value) => {
    return {
      kind: 'E',
      path,
      lhs: origin,
      rhs: value,
    }
  }
  createDiffNew = (path, value) => {
    return {
      kind: 'N',
      path,
      rhs: value
    }
  }
  createDiffDeleted = (path, value) => {
    return {
      kind: 'D',
      path,
      lhs: value
    }
  }
  createDiffArray = (path, index, item) => {
    return {
      kind: 'A',
      path,
      index: index,
      item: item,
    }
  }
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
      changes(this.createDiffNew(currentPath, rhs))
    } else if (!rdefined && ldefined) {
      changes(this.createDiffDeleted(currentPath, lhs))
    } else if (this.realTypeOf(lhs) !== this.realTypeOf(rhs)) {
      changes(this.createDiffEdit(currentPath, lhs, rhs))
    } else if (ltype === 'object' && lhs !== null && rhs !== null) {
      const stackHasLhs = stack.filter((stackItem) => stackItem.lhs === lhs).length
      if (!stackHasLhs) {
        stack.push({ lhs: lhs, rhs: rhs })
        if (Array.isArray(lhs)) {
          var i, len = lhs.length
          for (i = 0; i < lhs.length; i++) {
            if (i >= rhs.length) {
              changes(this.createDiffArray(currentPath, i, this.createDiffDeleted(undefined, lhs[i])))
            } else {
              this.deepDiff(lhs[i], rhs[i], changes, currentPath, i, stack)
            }
          }
          while (i < rhs.length) {
            changes(this.createDiffArray(currentPath, i, this.createDiffNew(undefined, rhs[i++])))
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
        changes(this.createDiffEdit(currentPath, lhs, rhs))
      }
    } else if (lhs !== rhs) {
      if (!(ltype === 'number' && isNaN(lhs) && isNaN(rhs))) {
        changes(this.createDiffEdit(currentPath, lhs, rhs))
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
