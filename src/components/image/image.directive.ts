/*
 * Copyright (C) 2015 The Gravitee team (http://gravitee.io)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import NotificationService from '../../services/notification.service';
import * as jdenticon from 'jdenticon';

class ImageDirective {
  constructor() {
    'ngInject';

    let directive = {
      restrict: 'E',
      require: 'graviteeIdentityPicture',
      scope: {
        image: '=',
        imageId: '=',
        imageClass: '@',
        imageDefault: '=',
        imageOriginal: '=?',
        imageForm: '=',
        imageUrl: '=',
        imageBorderRadius: '@',
        imageName: '=',
        noDefaultImage: '=',
        changeLabel: '@',
        deleteLabel: '@',
        canDelete: '=',
        successEventName: '@',
        checkeredBackground: '<'
      },
      template: require('./image.html'),
      controller: ImageController,
      controllerAs: 'imgCtrl'
    };

    return directive;
  }
}

class ImageController {
  constructor(private $rootScope, private $scope, private Upload, private NotificationService: NotificationService) {
    'ngInject';
    $scope.maxSize = '1MB';
    if ($scope.changeLabel == null) {
      $scope.changeLabel = 'Change picture';
    }
    if ($scope.deleteLabel == null) {
      $scope.deleteLabel = 'Delete';
    }
  }

  selectImage(file, invalidFiles) {
    if (file) {
      this.Upload.base64DataUrl(file).then((image: any) => {
        if (image) {
          if (!this.$scope.imageOriginal) {
            this.$scope.imageOriginal = this.$scope.image;
          }
          this.$scope.image = image;
          if (this.$scope.imageForm) {
            this.$scope.imageForm.$setDirty();
          }
          if (this.$scope.successEventName) {
            this.$rootScope.$broadcast(this.$scope.successEventName, { image: image });
          }
        }
      });
    }
    if (invalidFiles && invalidFiles.length > 0) {
      const fileError = invalidFiles[0];
      if (fileError.$error === 'maxSize') {
        this.NotificationService.showError(`Image "${ fileError.name }" exceeds the maximum authorized size (${ this.$scope.maxSize })`);
      } else {
        this.NotificationService.showError(`File is not valid (error: ${fileError.$error})`);
      }
    }
  }

  onDelete() {
    this.$scope.image = null;
    this.$scope.imageUrl = null;
    this.$rootScope.$broadcast('apiPictureChangeSuccess', { image: this.$scope.image });
    if (this.$scope.imageForm) {
      this.$scope.imageForm.$setDirty();
    }
  }

  isDefaultImage() {
    const jdenticonElement = document.querySelector('#jdenticon_' + this.$scope.imageId);
    if (jdenticonElement) {
      return jdenticonElement.classList.contains('show');
    }
  }
}

export default ImageDirective;
