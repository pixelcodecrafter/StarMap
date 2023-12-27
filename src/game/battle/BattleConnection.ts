import { NetworkAuth, SubscribeOnAccountChanging } from "~/blockchain";
import { MyEventDispatcher } from "../basics/MyEventDispatcher";
import { newGameAuth } from "~/blockchain/functions/gameplay";
import { Socket, io } from "socket.io-client";
import { Settings } from "../data/Settings";
import { getWalletAddress, isWalletConnected } from "~/blockchain/functions/auth";

export enum PackTitle {
    // for lobby
    sign = 'sign',
    startSearchGame = 'startSearchGame', // request
    stopSearchGame = 'stopSearchGame', // request
    gameSearching = 'gameSearching', // status, update, info
    gameStart = 'gameStart',
    // for game
    objectCreate = 'objectCreate',
    objectUpdate = 'objectUpdate',
    objectDestroy = 'objectDestroy',
    attack = 'attack'
}

export type ObjectType = 'Star' | 'Planet' | 'FighterShip' | 'BattleShip' | 'Homing';

export class BattleConnection extends MyEventDispatcher {
    private _socket: Socket;

    constructor() {
        super('BattleConnection');
        // auto connection
        if (Settings.BATTLE.localConnect) {
            this.connectLocal();
        }
        else {
            this.connectServer();
        }
    }

    private connectLocal() {
        this.closeConnection();
        this._socket = io('localhost:3078');
        this.initListeners();
    }

    private connectServer() {
        this.closeConnection();
        this._socket = io(Settings.BATTLE.serverAddr);
        this.initListeners();
    }

    private sendPacket(aPackTitle: PackTitle, aData: any) {
        this.logDebug(`sendPacket:`, aData);
        this._socket.emit(aPackTitle, aData);
        // this._ws?.send(JSON.stringify(aData));
    }

    private initListeners() {

        this._socket.on('connect', () => {
            this.logDebug('socket connected...');
        });

        this._socket.on(PackTitle.sign, (aData: {
            cmd: 'request'
        }) => {
            this.onSignRecv(aData);
        });

        this._socket.on(PackTitle.gameSearching, (aData: {
            status: 'started'
        }) => {
            this.logDebug(`gameSearching:`, aData);
            this.emit(PackTitle.gameSearching, aData);
        });

        this._socket.on(PackTitle.gameStart, (aData: {
            cmd?: string,
            timer: number,
            playerPosition: 'top' | 'bot'
        }) => {
            this.logDebug(`gameStart:`, aData);
            this.emit(PackTitle.gameStart, aData);
        });

        this._socket.on(PackTitle.objectCreate, (aData) => {
            this.logDebug(`objectCreate:`, aData);
            this.emit(PackTitle.objectCreate, aData);
        });

    }

    private onSignRecv(aData: {
        cmd: 'request' | 'reject' | 'success'
    }) {
        switch (aData.cmd) {
            case 'request':
                this.logDebug(`onSignRecv: request...`);
                this.signProcess1();
                break;
            case 'reject':
                this.logDebug(`onSignRecv: REJECT!`, aData);
                break;
            case 'success':
                this.logDebug(`onSignRecv: SUCCESS`, aData);
                break;
            default:
                this.logWarn(`onSignRecv: unknown status:`, aData);
                break;
        }
    }

    private signProcess1() {
        if (!isWalletConnected()) {
            NetworkAuth().then((aWallet: string) => {
                this.signProcess2();
            }).catch((reason) => {
                alert(reason);
            });
        }
        else {
            this.signProcess2();
        }
    }
    
    private signProcess2() {
        newGameAuth(getWalletAddress()).then(aSignature => {
            this.logDebug(`wallet auth...`);
            this._socket.emit(PackTitle.sign, aSignature);
        });
    }

    public get connected(): boolean {
        return this._socket.connected;
    }

    closeConnection() {
        if (this._socket) {
            this._socket.close();
            this._socket = null;
        }
    }

    sendSearchGame() {
        this._socket.emit(PackTitle.startSearchGame);
    }

    sendSearchGameBot() {
        this._socket.emit(PackTitle.startSearchGame, {
            withBot: true
        });
    }

    sendWithdrawGame() {
        // this.sendPacket(PackTitle.gameSearching, {
        //     action: "stop"
        // });
    }

    sendExitGame() {
        // this.sendPacket({
        //     action: "exitgame"
        // });
    }

    sendPlanetFire() {
        // this.sendPacket({
        //     action: "planetFire"
        // });
    }

}