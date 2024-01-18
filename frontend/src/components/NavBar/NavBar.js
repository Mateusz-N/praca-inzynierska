import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';

import { requestGetUserProfile, requestLogout, requestSpotifyAuthURL } from 'common/serverRequests';

import homeIcon from 'resources/home.svg';
import microphone_idle from 'resources/microphone_idle.svg';
import microphone_active from 'resources/microphone_active.svg';
import logo_spotify from 'resources/Spotify_Logo_RGB_Green.png'

import SearchBar from 'components/generic/SearchBar';
import ContextMenu from 'components/generic/ContextMenu';
import AboutModal from 'components/NavBar/AboutModal';
import Toast from 'components/generic/Toast';

import Styles from 'components/NavBar/NavBar.module.scss';

const NavBar = (props) => {
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
    const greetings = ['cześć', 'test', 'dzień dobry'];
    const grammar = '#JSGF V1.0; grammar greetings; public <greetings> = ' + greetings.join(' | ') + ';';
    const recognition = new SpeechRecognition();
    const recognitionList = new SpeechGrammarList();
    recognitionList.addFromString(grammar, 1);
    recognition.grammars = recognitionList;
    recognition.lang = 'pl-PL';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // #region Zmienne stanu (useState Hooks)
    const [loggedIn, setLoggedIn] = useState(false);
    const [microphoneActive, setMicrophoneActive] = useState(false);
    const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
    const [profileContextMenuExpanded, setProfileContextMenuExpanded] = useState(false);
    const [spotifyAuthURL, setSpotifyAuthURL] = useState('');
    const [modal_about_open, setModal_about_open] = useState(false);
    const [notification, setNotification] = useState({});
    // #endregion

    // #region Zmienne referencji (useRef Hooks)
    const ref_profilePic = useRef(null);
    // #endregion

    // #region Zmienne nawigacji (useNavigate Hooks)
    const navigate = useNavigate();
    // #endregion

    // #region Obsługa zdarzeń (Event Handlers)
    const handleToggleMicrophone = () => {
        setMicrophoneEnabled(prevState => !prevState);
    }
    const handleLogin = () => {
    /*  Otwarcie wyskakującego okienka z autoryzacją w serwisie Spotify */
        const popup = window.open(spotifyAuthURL, 'popup', 'popup=true');
        const checkPopup = setInterval(() => {
            if(popup.closed) {
                clearInterval(checkPopup);
                requestGetUserProfile((data) => {
                    Cookies.set('userID', data.userID, {secure: true, sameSite: 'strict'});
                    Cookies.set('userName', data.userName, {secure: true, sameSite: 'strict'});
                    Cookies.set('profilePicURL', data.profilePicURL, {secure: true, sameSite: 'strict'});
                    setLoggedIn(true);
                    props.onLogin();
                    setNotification(data.message);
                });
            }
        }, 100);
    }
    const handleLogout = () => {
    /*  Logika związana z sesją użytkownika opiera się
        na ciasteczkach po stronie klienta, więc wystarczy je usunąć */
        requestLogout((data) => {
            Cookies.remove('userID');
            Cookies.remove('userName');
            Cookies.remove('profilePicURL');
            props.onLogout();
            setNotification(data.message);
        });
        setLoggedIn(false);
    }
    const handleToggleProfileContextMenu = () => {
        setProfileContextMenuExpanded(prevState => !prevState);
    }
    const handleClickOutsideProfileContextMenu = (event) => {
        if(profileContextMenuExpanded && ((ref_profilePic.current && event.target !== ref_profilePic.current) || event.target.className.includes(Styles.profile_contextMenu_option))) {
            setProfileContextMenuExpanded(false);
        }
    }
    const handleSearchFormSubmit = (query) => {
        navigate(`/search?query=${query}`);
    }
    const handleSelectAbout = () => {
        setModal_about_open(true);
    }
    const handleModalClose_about = () => {
        setModal_about_open(false);
    }
    const handleActivateVoiceInput = () => {
        recognition.start();
        recognition.onresult = (event) => {
            let word = event.results[0][0].transcript;
            if(greetings.includes(word)) {
                alert("Witaj!");
            }
            else {
                alert(`"${word}" nie jest rozpoznawalnym poleceniem. Spróbuj jeszcze raz.`);
            }
          }
    }
    const handleDeactivateVoiceInput = () => {
        recognition.stop();
    }
    // #endregion

    // #region Wywołania zwrotne (useEffect Hooks)
    useEffect(() => {
        if(Cookies.get('userID')) {
            setLoggedIn(true);
        }
        if(spotifyAuthURL === '') {
            requestSpotifyAuthURL((data) => {
                setSpotifyAuthURL(data.authURL);
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[]);
    useEffect(() => {
        document.body.addEventListener('click', handleClickOutsideProfileContextMenu);
        return () => {
            document.body.removeEventListener('click', handleClickOutsideProfileContextMenu);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[profileContextMenuExpanded]);
    useEffect(() => {
        if(microphoneEnabled) {
            handleActivateVoiceInput();
            return;
        }
        handleDeactivateVoiceInput();
    },[microphoneEnabled]);
    // #endregion

    // #region Przypisanie dynamicznych elementów komponentu
    let modal_about = null;
    if(modal_about_open) {
        modal_about =
            createPortal(<AboutModal
                onClose = {handleModalClose_about}
            />, document.body);
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
            <nav id = {Styles.navBar}>
                <section id = {Styles.navBar_leftSection} className = {Styles.navBar_section}>
                    <Link to = '/'>
                        <img src = {homeIcon} alt = 'Home' id = {Styles.homeIcon} />
                    </Link>
                    <SearchBar onSubmit = {(query) => handleSearchFormSubmit(query)} />
                </section>
                <div id = {Styles.microphoneContainer}>
                    <img
                        src = {microphoneActive ? microphone_active : microphone_idle}
                        alt = {microphoneEnabled ? (microphoneActive ? 'Capturing voice...' : 'Awaiting input...') : 'Microphone off'}
                        id = {Styles.microphoneIcon}
                        className = {microphoneEnabled ? Styles.microphoneIcon_enabled : Styles.microphoneIcon_disabled}
                        onClick = {handleToggleMicrophone}
                    />
                </div>
                <section id = {Styles.navBar_rightSection} className = {Styles.navBar_section}>
                    <p id = {Styles.spotifyAttribution}>
                        Powered by
                        <Link to = 'https://open.spotify.com/'>
                            <img src = {logo_spotify} alt = 'Spotify' id = {Styles.spotifyLogo} />
                        </Link>
                    </p>
                    {loggedIn ?
                        <img
                            src = {Cookies.get('profilePicURL')}
                            alt = {Cookies.get('userName')}
                            id = {Styles.profilePic}
                            onClick = {handleToggleProfileContextMenu}
                            ref = {ref_profilePic}
                        />
                        :
                        <button id = {Styles.btnLogin} className = 'btnPrimary' onClick = {handleLogin}>Connect with Spotify</button>
                    }
                    {modal_about}
                    <ContextMenu expanded = {profileContextMenuExpanded} context = 'profile' styles = {Styles}>
                        <li id = {Styles.profileContextMenu_about} onClick = {handleSelectAbout}>About</li>
                        <li id = {Styles.profileContextMenu_settings}><Link to = '/settings'>Settings</Link></li>
                        <li id = {Styles.profileContextMenu_disconnect} onClick = {handleLogout} dangerous = 'true'>Disconnect</li>
                    </ContextMenu>
                </section>
            </nav>
        </>
    );
    // #endregion
}

export default NavBar;