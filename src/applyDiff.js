import _ from 'lodash'

class ApplyDiff {
  arrayRemove = (array, index) => {
    return [...array.slice(0, index), ...array.slice(index + 1)]
  }
  arrayAdd = (array, item, index) => {
    return [...array.slice(0, index), item, ...array.slice(index + 1)]
  }
  applyArrayChange = (target, change) => {
    const array = _.get(target, change.path)
    switch (change.item.kind) {
      case 'D':
        return this.setValue(target, change.path, this.arrayRemove(array, change.index))
      case 'E':
      case 'N':
        return this.setValue(target, change.path, this.arrayAdd(array, change.item.rhs, change.index))
    }
  }
  setValue = (target, path, rhs) => {
    return _.setWith({ ...target }, path, rhs, this.immutableCustomiser)
  }
  immutableCustomiser = (currentValue) => {
    if (_.isArray(currentValue)) {
      return [
        ...currentValue
      ]
    } else if (_.isObject(currentValue)) {
      return {
        ...currentValue
      }
    } else {
      return currentValue
    }
  }
  applyChange = (target, change) => {
    switch (change.kind) {
      case 'A':
        return this.applyArrayChange(target, change)
      case 'D':
        return this.setValue(target, change.path, change.rhs)
      case 'E':
      case 'N':
        return this.setValue(target, change.path, change.rhs)
    }
  }
  applyDifferences = (differences, state) => {
    return _.chain(differences)
      .reduce(this.applyChange, state)
      .value()
  }
}

export default new ApplyDiff()
