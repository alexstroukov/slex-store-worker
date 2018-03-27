import _ from 'lodash'

function arrayRemove (array, index) {
  return [...array.slice(0, index), ...array.slice(index + 1)]
}
function arrayAdd (array, item, index) {
  return [...array.slice(0, index), item, ...array.slice(index + 1)]
}
function applyArrayChange(target, change) {
  const array = _.get(target, path)
  switch (change.kind) {
    case 'D':
      return setValue(target, change.path, arrayRemove(array, change.index))
    case 'E':
    case 'N':
      return setValue(target, change.path, arrayAdd(array, change.index, change.item.rhs))
  }
}
function setValue (target, path, rhs) {
  return _.setWith({ ...target }, path, rhs, immutableCustomiser)
}
function immutableCustomiser (currentValue) {
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
function applyChange (target, change) {
  switch (change.kind) {
    case 'A':
      return applyArrayChange(target, change)
    case 'D':
      return setValue(target, change.path, change.rhs)
    case 'E':
    case 'N':
      return setValue(target, change.path, change.rhs)
  }
}
function applyDifferences (differences, state) {
  return _.chain(differences)
    .reduce(applyChange, state)
    .value()
}

export default applyDifferences
