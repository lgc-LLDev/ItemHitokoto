/* global ll mc PermType network Format NbtCompound NbtString NbtInt ParamType */
// LiteLoaderScript Dev Helper
/// <reference path="../HelperLib/src/index.d.ts"/>

const pluginName = 'ItemHitokoto'
const pluginDescription = '给你手中的物品命名为一条随机一言'
/** @type {[number, number, number]} */
const pluginVersion = [0, 1, 2]

const { Red, Green, Clear, Aqua, Gray, White } = Format
const hitoTypes = new Map([
  ['动画', 'a'],
  ['漫画', 'b'],
  ['游戏', 'c'],
  ['文学', 'd'],
  ['原创', 'e'],
  ['来自网络', 'f'],
  ['其他', 'g'],
  ['影视', 'h'],
  ['诗词', 'i'],
  ['网易云', 'j'],
  ['哲学', 'k'],
  ['抖机灵', 'l'],
])

/**
 * @param { { hitokoto: string, from: string, from_who: string } } hitoObj
 * @returns {string}
 */
function formatHito(hitoObj) {
  const { hitokoto, from, from_who: fromWho } = hitoObj
  return (
    `${Clear}${White}『${Aqua}${hitokoto}${White}』\n` +
    `${Gray}—— ${fromWho ? `${fromWho} ` : ''}「${from}」`
  )
}

/**
 * @template T
 * @param {Iterable<T>} it
 * @returns {T[]}
 */
function iterToArr(it) {
  /** @type {T[]} */
  const arr = []
  for (const i of it) arr.push(i)
  return arr
}

;(() => {
  const cmd = mc.newCommand('itemhitokoto', pluginDescription, PermType.Any)
  cmd.setAlias('ithito')
  cmd.optional('type', ParamType.RawText)
  cmd.overload(['type'])
  cmd.setCallback((_, origin, output, result) => {
    const { player: pl } = origin
    if (!pl) {
      output.error('非玩家无法执行')
      return false
    }

    const it = pl.getHand()
    if (it.isNull()) {
      output.error('请手持一件物品')
      return false
    }

    const { type } = result
    let typeChar = hitoTypes.get(type)
    if (type && !typeChar) {
      if (!iterToArr(hitoTypes.values()).includes(type)) {
        output.error(
          `错误的一言类型！\n` +
            `类型列表： ${iterToArr(hitoTypes.keys()).join('； ')}`,
        )
        return false
      }
      typeChar = type
    }
    typeChar = typeChar || ''

    network.httpGet(`https://v1.hitokoto.cn/?c=${typeChar}`, (code, res) => {
      if (!(code === 200)) {
        pl.tell(`${Red}请求一言接口失败：返回状态非200`)
        return
      }

      let ret
      try {
        ret = JSON.parse(res)
      } catch {
        pl.tell(`${Red}请求一言接口失败：返回值解析错误`)
        return
      }

      // https://www.minebbs.com/resources/customgetmap-custommap.4050/
      const nbt = it.getNbt()
      /** @type {NbtCompound | null} */
      // @ts-expect-error type cast
      let tag = nbt.getTag('tag')
      if (!tag) tag = new NbtCompound()

      if (!tag.getTag('RepairCost')) tag.setTag('RepairCost', new NbtInt(0))

      const hito = formatHito(ret)
      const nameNbt = new NbtString(hito)
      /** @type {NbtCompound | null} */
      // @ts-expect-error type cast
      const display = tag.getTag('display')
      if (!display) {
        tag.setTag(
          'display',
          new NbtCompound({
            Name: nameNbt,
          }),
        )
      } else {
        display.setTag('Name', nameNbt)
        tag.setTag('display', display)
      }

      nbt.setTag('tag', tag)

      it.setNbt(nbt)
      pl.refreshItems()

      pl.tell(`${Green}成功！\n${hito}`)
    })
    return true
  })
  cmd.setup()
})()

ll.registerPlugin(pluginName, pluginDescription, pluginVersion, {
  Author: 'student_2333',
  License: 'Apache-2.0',
})
