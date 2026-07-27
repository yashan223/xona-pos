!macro customUnInstall
  DetailPrint "Cleaning up Xona POS local storage, database files, and configuration..."
  RMDir /r "$APPDATA\xona-pos-desktop"
  RMDir /r "$APPDATA\Xona POS"
  RMDir /r "$LOCALAPPDATA\xona-pos-desktop"
  RMDir /r "$LOCALAPPDATA\xona-pos-desktop-updater"
  RMDir /r "$LOCALAPPDATA\Xona POS"
!macroend
