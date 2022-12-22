import { Component, Input, VERSION } from '@angular/core';
import { Auth } from 'aws-amplify';
import { BasicRestService } from 'src/app/service/basic-rest.service';
import { UploadResult } from "ngx-markdown-editor";
import jwt_decode from 'jwt-decode';
import { ActivatedRoute } from '@angular/router';
import { ChecklistDatabase } from '../navigation/sidenav.component';
import { Title } from '@angular/platform-browser';
import { environment } from 'src/environments/environment';

import '../../../assets/prism-custom.js';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss']
})
export class EditorComponent {

  @Input() showSidebar: Boolean;

  public showPreview: Boolean = false;
  public showSnackbar: Boolean = false;
  public editorMode: Boolean = false;
  public fullscreen: Boolean = false;

  angularVersion = VERSION.full;
  ngxMarkdownVersion = '12.0.1';

  private id: string;
  public title: string;
  public content: string;
  public isPublic: boolean;
  public publicLink: string;

  initialContent: string;

  keyPressCounter: number = 0;

  constructor(private database: ChecklistDatabase, private testService : BasicRestService, private route: ActivatedRoute, private titleService: Title) {
    this.preRender = this.preRender.bind(this);
    this.postRender = this.postRender.bind(this);
  }

  ngOnInit() {

    Auth.currentAuthenticatedUser().then((user) => {
      localStorage.setItem("currentUserId", user.username);
      localStorage.setItem("username", user.attributes.email);
    });

    this.database.initContentChange.subscribe(value => {
      this.id = value.id;
      this.title = value.title;
      this.content = value.content;
      this.titleService.setTitle(value.title);
      this.isPublic = value.isPublic;
      this.publicLink = environment.redirectSignIn + "/shared/" + this.id;
    });

    this.route.paramMap.subscribe(params => { 
      this.id = params.get('id');
      if (this.id) {
        this.testService.get("document/" + this.id).subscribe(message => {
          var document = JSON.parse(JSON.stringify(message))
          this.content = document.content
          this.title = document.title
          this.titleService.setTitle(document.title);
          this.isPublic = document.isPublic;
          this.publicLink = environment.redirectSignIn + "/shared/" + this.id;
        });
      }
    });

    this.startTimer();
  }

  togglePreviewPanel() {
    this.showPreview = !this.showPreview;
  }

  changeMode() {
      this.editorMode = !this.editorMode;
      if (this.editorMode) {
        this.keyPressCounter = 0;
        this.initialContent = (' ' + this.content).slice(1);
      }
  }

  cancelEdit() {
    this.editorMode = false;
    this.submit();
  }

  undoChanges() {
    if (confirm('Are you sure to undo all Changes to ' + this.title + '?')) {
      if (this.initialContent !== this.content) {
        this.keyPressCounter = 0;
        this.content = this.initialContent;
        this.submit();
      }
    }
  }

  onKeydown(event) {
    if (event.code !== "Escape") {
      this.keyPressCounter++
      if (this.keyPressCounter === 20) {
        this.keyPressCounter = 0;
        this.submit();
      }
    }
  }

  startTimer() {
    setInterval(() => {
      if (this.keyPressCounter > 0) {
        this.keyPressCounter = 0;
        this.submit();
      }
    },10000)
  }

  doUpload(files: Array<File>): Promise<Array<UploadResult>> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        let result: Array<UploadResult> = [];
        for (let file of files) {
          result.push({
            name: file.name,
            url: `https://avatars3.githubusercontent.com/${file.name}`,
            isImg: file.type.indexOf("image") !== -1
          });
        }
        resolve(result);
      }, 3000);
    });
  }

  onEditorLoaded(editor) {
    // console.log(`ACE Editor Ins: `, editor);
  }

  preRender(mdContent) {
    // console.log(`preRender fired`);
    // return new Promise((resolve) => {
    //   setTimeout(() => {
    //     resolve(mdContent);
    //   }, 4000);
    // })
    return mdContent;
  }

  postRender(html) {
    // console.log(`postRender fired`);
    return html;
  }

  onPreviewDomChanged(dom: HTMLElement) {
    // console.log(dom);
    // console.log(dom.innerHTML);
    // console.log(this.content)
  }

  onFullscreen(): void {

  }

  submit(): void {
    this.testService.post("saveDocument", 
      { 
        "id": this.id,
        "userId": localStorage.getItem("currentUserId"),
        "title": this.title,
        "content": this.content,
        "isPublic": this.isPublic
      }
    ).subscribe(() => {
      this.showSnackbar = true;
      setTimeout(() => {
        this.showSnackbar = false;
      }, 2000);
    });
  }

  shareDocument(): void {
    document.getElementById("share-button").children[0].classList.toggle("fa-share");
    document.getElementById("share-button").children[0].classList.toggle("fa-hourglass");
    this.testService.post("shareDocument", 
      { 
        "id": this.id,
        "isPublic": true
      }
    ).subscribe(() => {
      this.isPublic = true
      document.getElementById("share-button").children[0].classList.toggle("fa-share");
      document.getElementById("share-button").children[0].classList.toggle("fa-hourglass");
    });
  }

  unshareDocument(): void {
    document.getElementById("unshare-button").children[0].classList.toggle("fa-ban");
    document.getElementById("unshare-button").children[0].classList.toggle("fa-hourglass");
    this.testService.post("shareDocument", 
      { 
        "id": this.id,
        "isPublic": false,
      }
    ).subscribe(() => {
      this.isPublic = false;
      document.getElementById("unshare-button").children[0].classList.toggle("fa-ban");
      document.getElementById("unshare-button").children[0].classList.toggle("fa-hourglass");
    });
  }

  copyLinkToClipBoard(event, textToCopy): void {
    const selBox = document.createElement('textarea');
    selBox.value = textToCopy;
    document.body.appendChild(selBox);
    selBox.focus();
    selBox.select();
    if (event.target.children.length === 0) {
      event.target.classList.toggle("fa-link");
      event.target.classList.toggle("fa-check");
    } else {
      event.target.children[0].classList.toggle("fa-link");
      event.target.children[0].classList.toggle("fa-check");  
    }
    document.execCommand('copy');
    document.body.removeChild(selBox);
    setTimeout( function() {
      if (event.target.children.length === 0) {
        event.target.classList.toggle("fa-link");
        event.target.classList.toggle("fa-check");
      } else {
        event.target.children[0].classList.toggle("fa-link");
        event.target.children[0].classList.toggle("fa-check");
      }
    }, 1000);
  }

  getDecodedAccessToken(token: string): any {
    try {
      return jwt_decode(token);
    } catch(Error) {
      return null;
    }
  }
}
