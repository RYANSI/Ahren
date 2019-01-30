import SC from 'soundcloud'
import { call, put, takeEvery, takeLatest, select} from 'redux-saga/effects'

import { types as AudioTypes } from '../Audio/Audio.actions'
import { SC_ID } from '../../constants/app'

import {
    currentGenreFormatted as _currentGenreFormatted,
} from '../Player/Controls.selectors'

import {
    types,
} from './SoundCloud.actions'

import {
    nextPaginationIndex as _nextPaginationIndex,
    nextHref as _nextHref,
    limit as _limit,
    listenedToIds as _listenedToIds,
    currentSongId as _currentSongId,
    nextSongId as _nextSongId,
    collection as _collection,
    currentSongFormatted as _currentSongFormatted,
} from './SoundCloud.selectors'
import {
    audio as _audio,
    visualizerLoaded as _visualizerLoaded,
} from '../Audio/Audio.selectors'


function* onStartSoundCloud() {

    SC.initialize({
        client_id: SC_ID
    })

    yield put({type: types.SC__GET_SONGS,});
}

function* onGetSoundCloudSongs() {

    const currentGenreFormatted = yield select(_currentGenreFormatted)
    const nextPaginationNumber = yield select(_nextPaginationIndex)
    const limit = yield select(_limit)
    const nextHref = yield select(_nextHref)

    const url = nextHref || '/tracks'
    const opts = {
        tags: currentGenreFormatted,
        //bug in SC sdk causes it to only return a few unless limit is set
        limit,
        linked_partitioning: nextPaginationNumber,
    }

    try {
        const result = yield call(SC.get,
            url,
            opts,
        )

        yield put({
            type: types.SC__GET_SONGS_SUCCESS,
            ...{
                ...result,
                nextHref: result.next_href,
            }
        })
    } catch (e) {
        yield put({type: types.SC__GET_SONGS_ERROR, error: e,})
        return
    }
}

function* onAddSongToListenedToIds({ id }) {
    const listenedToIds = yield select(_listenedToIds)

    yield put({
        type: types.SC__SET_SONG_AS_LISTENED_SUCCESS,
        listenedToIds: [
        ...listenedToIds,
        id,
    ]})
}

function* onAddSongsToCollection({ collection }) {
    const oldCollection = yield select(_collection)

    yield put({
        type: types.SC__SET_COLLECTION,
        collection: [
            ...oldCollection,
            ...collection,
        ]
    })
}

function* onNextSong() {
    const currentSongId = yield select(_currentSongId)

    yield put({type: types.SC__SET_SONG_AS_LISTENED, id: currentSongId});
    yield put({type: types.SC__SET_NEXT_SONG, });
}

function* onSetNextSong() {
    const nextSongId = yield select(_nextSongId)

    if (!nextSongId) {
        yield put({type: types.SC__GET_SONGS,});
        return
    }

    yield put({type: types.SC__SET_CURRENT_SONG_ID, id: nextSongId,});
}

function* presetCurrentSong() {
    const currentSongId = yield select(_currentSongId)

    if (currentSongId) {
        return
    }

    const nextSongId = yield select(_nextSongId)

    yield put({type: types.SC__SET_CURRENT_SONG_ID, id: nextSongId,});
}

function* onSetAudioSrc() {
    const audio = yield select(_audio)
    const currentSongFormatted = yield select(_currentSongFormatted)
    const visualizerLoaded = yield select(_visualizerLoaded)

    const { streamUrl } = currentSongFormatted

    audio.pause()
    audio.src = streamUrl
    audio.crossOrigin = 'anonymous'

    yield put({type: AudioTypes.AUDIO__AUDIO_UPDATED, audio,})

    if (visualizerLoaded) {
        yield put({type: AudioTypes.AUDIO__PLAY, });
    }
}


const sagas = [
    takeLatest(types.SC__SET_SONG_AS_LISTENED, onAddSongToListenedToIds),
    takeLatest(types.SC__LOAD, onStartSoundCloud),
    takeLatest(types.SC__GET_SONGS, onGetSoundCloudSongs),
    takeLatest(types.SC__NEXT_SONG, onNextSong),
    takeLatest(types.SC__SET_NEXT_SONG, onSetNextSong),
    takeLatest(types.SC__GET_SONGS_SUCCESS, onAddSongsToCollection),
    takeLatest(types.SC__SET_COLLECTION, presetCurrentSong),
    takeLatest(types.SC__AUDIO_SET_SRC, onSetAudioSrc),
]

export default sagas
