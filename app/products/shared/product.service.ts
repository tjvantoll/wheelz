import { Injectable, NgZone } from "@angular/core";
import { Http } from "@angular/http";
import { BehaviorSubject, Observable } from "rxjs/Rx";

import { Kinvey } from "kinvey-nativescript-sdk";
import { Config } from "../../shared/config";
import { Product } from "./product.model";

import * as fs from "file-system";

var imageSource = require("image-source");
@Injectable()
export class ProductService {
    private allProducts: Array<Product> = [];
    private productsStore = Kinvey.DataStore.collection<Product>("Product");

    constructor(private _ngZone: NgZone) { }

    getProductById(id: string) {
        if (!id) {
            return;
        }

        return this.allProducts.filter((product) => {
            return product._id === id;
        })[0];
    }

    load(): Observable<any> {
        return new Observable((observer: any) => {
            this.login().then(() => {
                return this.syncDataStore();
            }).then(() => {
                const stream = this.productsStore.find();

                return stream.toPromise();
            }).then((data) => {
                this.allProducts = [];
                data.forEach((product) => {
                    this.allProducts.push(new Product(product));
                });

                observer.next(this.allProducts);
            }).catch(this.handleErrors);
        });
    }

    update(editObject: Product) {
        return this.productsStore.save(editObject);
    }

    uploadImage(remoteFullPath: string, localFullPath: string) {
        let imageFile = fs.File.fromPath(localFullPath);
        let binarySource = imageFile.readSync(err => { console.log("Error reading binary:" + err); });

        const metadata = {
            filename: 'image.jpg',
            mimeType: 'image/jpeg',
            public: true
        };

        return Kinvey.Files.upload(imageFile, metadata);
    }

    private syncDataStore() {
        return this.productsStore.pendingSyncEntities().then((pendingEntities: any[]) => {
            let queue = Promise.resolve();

            if (pendingEntities && pendingEntities.length) {
                queue = queue
                    .then(() => this.productsStore.push())
                    .then((entities: Kinvey.PushResult<Product>[]) => {

                        /* ***********************************************************
                        * Each item in the array of pushed entities will look like the following
                        * { _id: '<entity id before push>', entity: <entity after push> }
                        * It could also possibly have an error property if the push failed.
                        * { _id: '<entity id before push>', entity: <entity after push>, error: <reason push failed> }
                        * Learn more about in this documentation article:
                        * http://devcenter.kinvey.com/nativescript/guides/datastore#push
                        *************************************************************/
                    });
            }

            return queue;
        });
    }

    private login(): Promise<any> {
        if (!!Kinvey.User.getActiveUser()) {
            return Promise.resolve();
        } else {
            return Kinvey.User.login(Config.kinveyUsername, Config.kinveyPassword);
        }
    }


    private handleErrors(error: Response) {
        console.log(error);

        return Observable.throw(error);
    }
}