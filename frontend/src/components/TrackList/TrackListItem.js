import { useState, useEffect, useRef, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import Cookies from 'js-cookie';

import { requestToggleTrackSaved, requestRemoveTrackFromPlaylist } from 'common/serverRequests';
import { millisecondsToFormattedTime } from 'common/auxiliaryFunctions';

import placeholderAlbumCoverSrc from 'resources/albumCover_placeholder.png';
import btn_play from 'resources/btn_play.svg';
import btn_pause from 'resources/btn_pause.svg';

import KebabMenu from 'components/generic/KebabMenu';
import AddTrackToPlaylistsModal from 'components/TrackList/AddTrackToPlaylistsModal';
import TrackDetailsModal from 'components/TrackList/TrackDetailsModal';
import Toast from 'components/generic/Toast';

import Styles from 'components/TrackList/TrackListItem.module.scss';

const TrackListItem = (props) => {
    // #region Zmienne globalne
    const track = props.track;
    const index = props.index;
    const playlist = props.playlist;
    const defaultPlaying = props.defaultPlaying;
    const defaultSelectAction = props.defaultSelectAction;
    const defaultFormAction = props.defaultFormAction;
    const defaultPlaylistAction = props.defaultPlaylistAction;
    const defaultDisplayDetails = props.defaultDisplayDetails;
    const playing = props.playing;
    const userPlaylists = props.userPlaylists;
    const handleToggleTrackPlayback = props.onPlaybackToggle;
    // #endregion

    // #region Zmienne stanu (useState Hooks)
    const [trackSaved, setTrackSaved] = useState(track.saved);
    const [modal_addToPlaylist_open, setModal_addToPlaylist_open] = useState(false);
    const [modal_trackDetails_open, setModal_trackDetails_open] = useState(false);
    const [trackRowActive, setTrackRowActive] = useState(false);
    const [notification, setNotification] = useState({});
    // #endregion

    // #region Zmienne referencji (useRef Hooks)
    const ref_btnTogglePlayback = useRef(null);
    // #endregion

    // #region Obsługa zdarzeń (Event Handlers)
    const handleToggleTrackSaved = () => {
        props.onTrackInPlaylistAction();
        const initiallySaved = trackSaved;
        setTrackSaved(prevState => !prevState);
        toggleTrackSaved(initiallySaved);
    }
    const handleTrackKebabMenuExpand = () => {
        setTrackRowActive(true);
    }
    const handleTrackKebabMenuCollapse = () => {
        if(!modal_addToPlaylist_open) {
            setTrackRowActive(false);
        }
    }
    const handleSelectAddToPlaylist = () => {
        setModal_addToPlaylist_open(true);
    }
    const handleSelectRemoveFromPlaylist = () => {
        props.onTrackInPlaylistAction();
        removeTrackFromPlaylist(playlist.id);
    }
    const handleModalClose_addToPlaylist = () => {
        props.onTrackInPlaylistAction();
        setModal_addToPlaylist_open(false);
        setTrackRowActive(false);
    }
    const handleSelectTrackDetails = () => {
        setModal_trackDetails_open(true);
    }
    const handleModalClose_trackDetails = () => {
        props.onTrackDetailsModalClose();
        setModal_trackDetails_open(false);
        setTrackRowActive(false);
    }
    // #endregion

    // #region Funkcje pomocnicze
    const toggleTrackSaved = (saved) => {
        requestToggleTrackSaved(track.id, saved, (data) => {
            setNotification(data.message);
        });
    }
    const removeTrackFromPlaylist = (playlistID) => {
        requestRemoveTrackFromPlaylist(playlistID, [`spotify:track:${track.id}`], (data) => {
            const notificationMessage = data.message.type === 'success' ? 'Track removed from playlist successfully!' : data.message.message;
            props.onNotification({message: notificationMessage, type: data.message.type});
            props.onPlaylistUpdate();
        });
    }
    // #endregion

    // #region Wywołania zwrotne (useEffect Hooks)
    useEffect(() => {
        if(defaultPlaying == null || (playing === defaultPlaying)) {
            return;
        }
        ref_btnTogglePlayback.current.click();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[defaultPlaying]);
    useEffect(() => {
        if(defaultDisplayDetails) {
            setModal_trackDetails_open(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[defaultDisplayDetails]);
    useEffect(() => {
        if(defaultPlaylistAction == null) {
            return;
        }
        if(defaultPlaylistAction.target === 'saved') {
            if((defaultPlaylistAction.action === 'add' && !trackSaved) || (defaultPlaylistAction.action === 'remove' && trackSaved)) {
                handleToggleTrackSaved();
            }
            return;
        }
        if(defaultPlaylistAction.target === 'playlist') {
            if(defaultPlaylistAction.action === 'add') {
                handleSelectAddToPlaylist();
                return;
            }
            if(defaultPlaylistAction.action === 'remove') {
                handleSelectRemoveFromPlaylist();
                return;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[defaultPlaylistAction]);
    useEffect(() => {
        setTrackSaved(track.saved);
    },[track.saved]);
    // #endregion

    // #region Przypisanie dynamicznych elementów komponentu, obsługa wartości null/undefined
    let albumColumn = null;
    let releaseDateColumn = null;
    let dateAddedColumn = null;
    let artistsColumnContents = '?';
    let trackArtists = [];
    let trackAlbum = {
        id: null,
        name: '?',
        images: [],
        release_date: '?'
    };
    let contextMenu_savedTracksAction =
        <li id = {Styles.trackList_item_contextMenu_addToFavorites} onClick = {handleToggleTrackSaved}>
            Add to favorites
        </li>;
    if(trackSaved) {
        contextMenu_savedTracksAction =
            <li id = {Styles.trackList_item_contextMenu_removeFromFavorites} onClick = {handleToggleTrackSaved} dangerous = 'true'>
                Remove from favorites
            </li>
    }
    let contextMenu_removeFromPlaylist = null;
    if(props.for === 'playlist') {
        contextMenu_removeFromPlaylist =
            <li id = {Styles.trackList_item_contextMenu_removeFromPlaylist} onClick = {handleSelectRemoveFromPlaylist} dangerous = 'true'>
                Remove from this playlist
            </li>
    }
    let modal_addToPlaylist = null;
    if(modal_addToPlaylist_open) {
        modal_addToPlaylist =
            createPortal(<AddTrackToPlaylistsModal
                index = {index}
                track = {track}
                context = {props.for}
                defaultSelectAction = {defaultSelectAction}
                defaultAction = {defaultFormAction}
                userPlaylists = {userPlaylists.filter(playlist => playlist.owner.id === Cookies.get('userID'))}
                onClose = {handleModalClose_addToPlaylist}
                onPlaylistUpdate = {props.onPlaylistUpdate}
                onPlaylistSelection = {props.onSelectAction}
                onNotification = {(notification) => setNotification(notification)}
            />, document.body);
    }
    let modal_trackDetails = null;
    if(modal_trackDetails_open) {
        let albumAttribute = {};
        if(props.for === 'album') {
            albumAttribute.album = playlist;
        }
        modal_trackDetails =
            createPortal(<TrackDetailsModal
                index = {index}
                track = {track}
                defaultAction = {defaultFormAction}
                onClose = {handleModalClose_trackDetails}
                {...albumAttribute}
            />, document.body);
    }
    let kebabMenu = null;
    if(!track.local) {
        kebabMenu = 
            <KebabMenu
                context = 'trackList_item'
                kebabBtnID = {'trackList_item_btnKebab_' + index} // track.id jest zawodne, gdyż pliki lokalne nie posiadają ID
                styles = {Styles}
                onExpand = {handleTrackKebabMenuExpand}
                onCollapse = {handleTrackKebabMenuCollapse}
            >
                {contextMenu_savedTracksAction}
                <li id = {Styles.trackList_item_contextMenu_addToPlaylist} onClick = {handleSelectAddToPlaylist}>
                    Add to playlist...
                </li>
                {contextMenu_removeFromPlaylist}
                <li id = {Styles.trackList_item_contextMenu_trackDetails} onClick = {handleSelectTrackDetails}>Track details</li>
            </KebabMenu>
    }
    if(track && Object.keys(track).length > 0) {
        if(track.artists) {
            trackArtists = track.artists;
        }
        if(trackArtists[0].name.length > 0) {
            artistsColumnContents = trackArtists.map((artist, index) => {
                return(
                    <Fragment key = {index}>
                        <Link to = {'/artist/' + artist.id}>{artist.name}</Link>
                        {index === trackArtists.length - 1 ? '' : ', '}
                    </Fragment>
                )
            });
        }
        if(track.album) {
            if(track.album.id) {
                trackAlbum.id = track.album.id;
            }
            if(track.album.name) {
                trackAlbum.name = track.album.name;
            }
            if(track.album.images) {
                trackAlbum.images = track.album.images;
            }
            if(track.album.release_date) {
                trackAlbum.release_date = track.album.release_date;
            }
        }
    }
    if(props.for === 'playlist') {
        let albumName = trackAlbum.name;
        let releaseDateColumnContents = trackAlbum.release_date;
        const dateAddedColumnContents = new Date(track.dateAdded).toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'});

        if(trackAlbum.id && trackAlbum.name !== '?') {
            albumName = <Link to = {'/album/' + trackAlbum.id}>{trackAlbum.name}</Link>
        }
        const albumColumnContents =
            <div className = {Styles.trackList_item_album}>
                <Link to = {'/album/' + trackAlbum.id}>
                    <img
                        src = {trackAlbum.images.length > 0 ? trackAlbum.images[0].url : placeholderAlbumCoverSrc}
                        alt = {trackAlbum.name}
                        className = {Styles.trackList_item_albumCover}
                    />
                </Link>
                <p>
                    {albumName}
                </p>
            </div>
        if(releaseDateColumnContents !== '?') {
            releaseDateColumnContents = trackAlbum.release_date.split('-').shift();
        }
        albumColumn = <td>{albumColumnContents}</td>;
        releaseDateColumn = <td>{releaseDateColumnContents}</td>;
        dateAddedColumn = <td>{dateAddedColumnContents}</td>;
    }
    let toastNotification = null;
    if(notification.message) {
        toastNotification =
            createPortal(<Toast message = {notification.message} type = {notification.type} onAnimationEnd = {() => setNotification({})} />, document.body);
    }
    // #endregion
    
    // #region Struktura komponentu (JSX)
    return(
        <>
            {toastNotification}
            <tr key = {index} className = {Styles.trackList_item + (trackRowActive ? ' ' + Styles.trackList_item_active : '')}>
                <td>{index + 1}</td>
                <td>
                    <div className = {Styles.trackList_item_title}>
                        <img
                            src = {playing ?  btn_pause : btn_play}
                            alt = {playing ? 'Pause' : 'Play'}
                            className = {Styles.trackList_item_btnTogglePlayback + ' ' + (playing ? Styles.trackList_item_btnPause : Styles.trackList_item_btnPlay)}
                            onClick = {() => track.local ? setNotification({message: 'Local tracks are not supported!', type: 'error'}) : handleToggleTrackPlayback(track)}
                            ref = {ref_btnTogglePlayback}
                        />
                        <p
                            className = {Styles.trackList_item_titleText}
                            onClick = {() => track.local ? setNotification({message: 'Local tracks are not supported!', type: 'error'}) : handleToggleTrackPlayback(track)}
                        >
                            {track.title}
                        </p>
                    </div>
                </td>
                <td>{artistsColumnContents}</td>
                {albumColumn}
                {releaseDateColumn}
                {/* <td>{track.genres.join(', ')}</td> */}{/*   Spotify API obecnie nie dostarcza gatunków utworów w punkcie końcowym pobierania list odtwarzania...
                                                                Udostępnia je w punkcie końcowym pobierania utworu...
                                                                Jednak dla dużych list odtwarzania byłoby to bardzo kosztowne */}
                <td>{millisecondsToFormattedTime(track.duration_ms)}</td>
                {dateAddedColumn}
                <td className = {Styles.trackList_item_tdKebab}>
                    {modal_addToPlaylist}
                    {modal_trackDetails}
                    {kebabMenu}
                </td>
            </tr>
        </>
    );
    // #endregion
}

export default TrackListItem;