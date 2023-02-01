$(function () {
    $('#submit').click(function () {
        $('#form').addClass('d-none')
        $('#uploading').removeClass('d-none')

        plausible('Submit')

        var data = {
            'prize-application-prize': $('#prize').val(),
            'prize-application-category': $('#category').val(),
            'prize-application-candidate-name': $('#candidate-name').val(),
            'prize-application-candidate-birthyear': $('#candidate-birthyear').val(),
            'prize-application-candidate-phone': $('#candidate-phone').val(),
            'prize-application-candidate-email': $('#candidate-email').val(),
            'prize-application-candidate-workplace': $('#candidate-workplace').val(),
            'prize-application-applicant-name': $('#applicant-name').val(),
            'prize-application-applicant-email': $('#applicant-email').val(),
            'prize-application-applicant-workplace': $('#applicant-workplace').val(),
            'prize-application-notes': $('#notes').val(),
            'prize-application-urls': $('#urls').val()
        }

        var files = []
        var fileElements = $('#file input[type="file"]')

        for (let i = 0; i < fileElements.length; i++) {
            for (let n = 0; n < fileElements[i].files.length; n++) {
                files.push(fileElements[i].files[n])
            }
        }

        createEntity(data, function(newEntityId) {
            var filesUploaded = 0
            var filesToUpload = files.length

            console.log('Created entity #' + newEntityId)
            console.log(filesToUpload + ' file(s) to upload')

            if (filesToUpload > 0) {
                for (let i = 0; i < filesToUpload; i++) {
                    createFileProperty(newEntityId, files[i], function(result) {
                        filesUploaded++
                        console.log('Created file property #', result)
                        if (filesToUpload === filesUploaded) {
                            updateRights(newEntityId, function (r) {
                                console.log('Updated rights')

                                $('#uploading').addClass('d-none')
                                $('#done').removeClass('d-none')
                            })
                        }
                    })
                }
            } else {
                updateRights(newEntityId, function (r) {
                    console.log('Updated rights')

                    $('#uploading').addClass('d-none')
                    $('#done').removeClass('d-none')
                })
            }
        })
    })

    function createEntity(properties, callback) {
        properties.definition = 'prize-application'

        $.ajax({
            method: 'POST',
            url: window.entuApiUrl + '/entity-' + window.entuApiId,
            cache: false,
            data: signRequest(properties),
            dataType: 'json',
            success: function(data) {
                callback(data.result.id)
            }
        })
    }

    function createFileProperty(entityId, file, callback) {
        var fileData = {
            entity: entityId,
            property: 'prize-application-file',
            filename: file.name,
            filesize: file.size,
            filetype: file.type
        }

        plausible('Upload')

        $.ajax({
            method: 'POST',
            url: window.entuApiUrl + '/file/s3',
            cache: false,
            data: signRequest(fileData),
            dataType: 'json',
            success: function(data) {
                uploadToS3(file, data.result.s3.url, data.result.s3.data, function() {
                    callback(data.result.properties['prize-application-file'][0].id)
                })
            }
        })
    }

    function uploadToS3(file, s3url, s3data, callback) {
        var xhr = new XMLHttpRequest()
        var form = new FormData()

        for(var i in s3data) {
            form.append(i, s3data[i])
        }
        form.append('file', file)

        xhr.upload.addEventListener('progress', function(event) {
            if(event.lengthComputable) {
                console.log(file.name + ' - ' + Math.round(event.loaded * 1000 / event.total) / 10 + '%')
            }
        }, false)

        xhr.onreadystatechange = function() {
            if(xhr.readyState == 4 && xhr.status == 201) {
                callback($('Key', xhr.responseXML).text())
            }

            if(xhr.readyState == 4 && xhr.status != 201) {
                console.error(file.name + ' - UPLOAD ERROR!')
            }
        }

        xhr.open('POST', s3url, true)
        xhr.send(form)
    }

    function updateRights(entityId, callback) {
        var data = {
            entity: window.entuApiUser
        }

        $.ajax({
            method: 'POST',
            url: window.entuApiUrl + '/entity-' + entityId + '/rights',
            cache: false,
            data: signRequest(data),
            dataType: 'json',
            success: function() {
                callback()
            }
        })
    }

    function signRequest(data) {
        var expiration = new Date()
        expiration.setMinutes(expiration.getMinutes() + 10)

        var conditions = []
        for(k in data) {
            conditions.push({ k: data[k] })
        }

        data.user = window.entuApiUser
        data.policy = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(JSON.stringify({ expiration: expiration.toISOString(), conditions: conditions })))
        data.signature = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA1(data['policy'], window.entuApiKey))

        return data
    }
})
