import bgEntrance from '../assets/environments/bg-01-entrance.jpg'
import bgWaitingRoom from '../assets/environments/bg-02-waiting-room.jpg'
import bgDressingRoom from '../assets/environments/bg-03-dressing-room.jpg'
import bgCeremony from '../assets/environments/bg-04-ceremony.jpg'
import bgReception from '../assets/environments/bg-05-reception.jpg'
import bgGarden from '../assets/environments/bg-06-garden.jpg'
import bridalClockFocus from '../assets/environments/bridal-clock-focus.jpg'
import ceremonyAltarUnlit from '../assets/environments/ceremony-02-altar-unlit.jpg'
import ceremonyAltarLit from '../assets/environments/ceremony-03-altar-lit.jpg'
import drawerClosed from '../assets/environments/drawer-closed.jpg'
import drawerOpen from '../assets/environments/drawer-open.jpg'
import gardenBook from '../assets/environments/garden-book.jpg'
import gardenFocusAngel from '../assets/environments/garden-focus-angel.jpg'
import gardenFocusBirdcage from '../assets/environments/garden-focus-birdcage.jpg'
import gardenFocusFountain from '../assets/environments/garden-focus-fountain.jpg'
import gardenFocusGate from '../assets/environments/garden-focus-gate.jpg'
import gardenFocusLamp from '../assets/environments/garden-focus-lamp.jpg'
import invitationSchedule from '../assets/environments/invitation-01-schedule.jpg'
import letterTrueRoute from '../assets/environments/letter-true-route.jpg'
import p03ReceptionSeatingChart from '../assets/environments/p03-reception-seating-chart.jpg'
import p03ReceptionTableLily from '../assets/environments/p03-reception-table-lily.jpg'
import p03ReceptionTableMimosa from '../assets/environments/p03-reception-table-Mimosa.jpg'
import p03ReceptionTableOlive from '../assets/environments/p03-reception-table-Olive.jpg'
import p03ReceptionTableRose from '../assets/environments/p03-reception-table-Rose.jpg'
import p03SweetheartTable from '../assets/environments/p03-sweetheart-table.jpg'
import p04OverlayBase from '../assets/environments/p04-overlay-base.jpg'
import p04OverlayCompleted from '../assets/environments/p04-overlay-completed.jpg'
import photoA from '../assets/environments/photoA.jpg'
import photoB from '../assets/environments/photoB.jpg'
import photoC from '../assets/environments/photoC.jpg'
import photoD from '../assets/environments/photoD.jpg'
import photoE from '../assets/environments/photoE.png'
import receptionPianoArea from '../assets/environments/reception-piano-area.jpg'
import receptionTableFocusLeft from '../assets/environments/reception-table-focus_left.jpg'
import receptionTableFocusRight from '../assets/environments/reception-table-focus_right.jpg'
import coffee from '../assets/environments/Puzzle 01/Coffee.jpg'
import gateauChocolat from '../assets/environments/Puzzle 01/GateauChocolat.jpg'
import hotTee from '../assets/environments/Puzzle 01/HotTea.jpg'
import iceTee from '../assets/environments/Puzzle 01/IceTea.jpg'
import mangoCake from '../assets/environments/Puzzle 01/MangoCake.jpg'
import shortCake from '../assets/environments/Puzzle 01/ShortCake.jpg'
import doorKey from '../assets/environments/item/door-key.png'
import itemPhotoA from '../assets/environments/item/item-photoA.jpg'
import itemPhotoB from '../assets/environments/item/item-photoB.jpg'
import itemPhotoC from '../assets/environments/item/item-photoC.jpg'
import itemPhotoD from '../assets/environments/item/item-photoD.jpg'
import minuteHand from '../assets/environments/item/minute-hand.png'
import hourHand from '../assets/environments/item/hour-hand.jpg'

export const gameImageAssets = Array.from(new Set([
  bgEntrance,
  bgWaitingRoom,
  bgDressingRoom,
  bgCeremony,
  bgReception,
  bgGarden,
  bridalClockFocus,
  ceremonyAltarUnlit,
  ceremonyAltarLit,
  drawerClosed,
  drawerOpen,
  gardenBook,
  gardenFocusAngel,
  gardenFocusBirdcage,
  gardenFocusFountain,
  gardenFocusGate,
  gardenFocusLamp,
  invitationSchedule,
  letterTrueRoute,
  p03ReceptionSeatingChart,
  p03ReceptionTableLily,
  p03ReceptionTableMimosa,
  p03ReceptionTableOlive,
  p03ReceptionTableRose,
  p03SweetheartTable,
  p04OverlayBase,
  p04OverlayCompleted,
  photoA,
  photoB,
  photoC,
  photoD,
  photoE,
  receptionPianoArea,
  receptionTableFocusLeft,
  receptionTableFocusRight,
  coffee,
  gateauChocolat,
  hotTee,
  iceTee,
  mangoCake,
  shortCake,
  doorKey,
  itemPhotoA,
  itemPhotoB,
  itemPhotoC,
  itemPhotoD,
  minuteHand,
  hourHand,
]))

export type ImagePreloadProgress = {
  loaded: number
  total: number
}

export const getPreloadImageCount = (): number => gameImageAssets.length

export const preloadImages = (
  imageUrls: string[],
  onProgress?: (progress: ImagePreloadProgress) => void,
): Promise<ImagePreloadProgress> => {
  const uniqueUrls = Array.from(new Set(imageUrls)).filter(Boolean)
  const total = uniqueUrls.length
  let loaded = 0

  const emitProgress = () => onProgress?.({ loaded, total })
  emitProgress()

  if (total === 0 || typeof Image === 'undefined') {
    loaded = total
    emitProgress()
    return Promise.resolve({ loaded, total })
  }

  return new Promise((resolve) => {
    const completeOne = () => {
      loaded += 1
      emitProgress()
      if (loaded >= total) resolve({ loaded, total })
    }

    uniqueUrls.forEach((url) => {
      const image = new Image()
      image.onload = completeOne
      image.onerror = completeOne
      image.src = url
    })
  })
}

