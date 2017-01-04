$(function() {

    var app = $('#app');
    var input = app.find('#taskInput');
    var addBtn = app.find('#addTaskBtn');
    var priority = app.find('#priority');
    var taskList = app.find('#taskList');
    var removeCompleteBtn = app.find('#removeCompletedBtn');
    var removeAllBtn = app.find('#removeAllTasksBtn');
    var modal = $('#modal');
    var closeModal = modal.find('#closeModal');
    var modalText = modal.find('#modalText');
    var callendar = $('#datepicker');
    var singleDayTask = {};

    callendar.datepicker({
        firstDay: 1
    });

    var selectedDay = callendar.datepicker('getDate').toLocaleDateString().replace(/\./g, '-');

    callendar.on('change', function() {
        selectedDay = callendar.datepicker('getDate').toLocaleDateString().replace(/\./g, '-');
        renderTasks(singleDayTask);
    });

    app.on('keyup', 'textarea', function() {
        $(this).css('height', '1px');
        var height = (5 + $(this).prop('scrollHeight')) + "px";
        $(this).css('height', height);
    });

    addBtn.on('click', function() {
        var inputValue = input.val();
        var idVal = Date.now();

        input.css('height', '27px');

        if ($.trim(inputValue).length <= 2) {
            modalText.text('The text of the task is too short');
            modal.css('display', 'block');
            return;

        } else if ($.trim(inputValue).length >= 100) {
            modalText.text('The text of the task is too long');
            modal.css('display', 'block');
            return;
        }

        if (singleDayTask[selectedDay] !== undefined) {
            singleDayTask[selectedDay].push({
                taskText: inputValue,
                complete: false,
                id: idVal,
                priority: priority.val()
            });
        } else {
            singleDayTask[selectedDay] = {};
            singleDayTask[selectedDay] = [];
            singleDayTask[selectedDay].push({
                taskText: inputValue,
                complete: false,
                id: idVal,
                priority: priority.val()
            });
        }

        input.val('');
        priority.val('2');

        saveTasks();
        renderTasks(singleDayTask);
    });

    function saveTasks() {
        firebase.database().ref('singleDayTask').set(singleDayTask);
    }

    function loadTasks() {
        firebase.database().ref('singleDayTask').once('value', function(data) {
            singleDayTask = data.val();
            if (singleDayTask === null) {
                singleDayTask = {};
            }
            renderTasks(singleDayTask);
        });
    }

    function renderTasks(singleDayTask) {
        var resultHtml = '';

        taskList.html('');

        function compare(a, b) {
            return a.priority - b.priority;
        }

        if (singleDayTask[selectedDay] !== undefined && singleDayTask[selectedDay].length > 0) {
            singleDayTask[selectedDay].sort(compare);
            for (var i = 0; i < singleDayTask[selectedDay].length; i++) {
                resultHtml += '<li class="taskLine"><button type="button" class="deleteBtn button icon-trash" title="Delete task"></button><button type="button" class="completeBtn button icon-check-empty" title="Mark as completed task"></button><div  class="task taskText" data-complete="' + singleDayTask[selectedDay][i].complete + '" data-id="' + singleDayTask[selectedDay][i].id + '" data-priority="' + singleDayTask[selectedDay][i].priority + '" contentEditable="false">' + singleDayTask[selectedDay][i].taskText + '</div><button class="editBtn button icon-edit-alt" type="button" title="Edit task"></button><select class="priority" title="Select priority" disabled><option value="1">High</option><option value="2">Normal</option><option value="3">Low</option></select></li>';
                removeAllBtn.removeAttr('disabled').addClass('active');
            }
        } else {
            resultHtml += '<li class="taskLine"><span class="task taskText noTasks">No tasks to do on this day</span></li>';
            removeAllBtn.attr('disabled', 'disabled').removeClass('active');
        }

        taskList.html(resultHtml);

        var select = $('ul select');
        for (var j = 0; j < select.length; j++) {
            if ($(select[j]).prev().prev().data('priority') === 1) {
                $(select[j]).find('option[value="1"]').attr('selected', 'selected');
            } else if ($(select[j]).prev().prev().data('priority') === 2) {
                $(select[j]).find('option[value="2"]').attr('selected', 'selected');
            } else {
                $(select[j]).find('option[value="3"]').attr('selected', 'selected');
            }
        }

        var tasks = $('.task');
        for (var k = 0; k < tasks.length; k++) {
            if ($(tasks[k]).data('complete') === true) {
                $(tasks[k]).addClass('complete');
                $(tasks[k]).prev().addClass('icon-check');
            }
        }

        isComplete();

        app.find(".deleteBtn").on('click', deleteTask);
        app.find(".completeBtn").on('click', completeTask);
        app.find(".editBtn").on('click', editTask);
    }

    function completeTask() {
        var id = $(this).next().data('id');
        var taskIndex = singleDayTask[selectedDay].map(function(singleTask) {
            return singleTask.id;
        }).indexOf(id);

        if (singleDayTask[selectedDay][taskIndex].complete === false) {
            singleDayTask[selectedDay][taskIndex].complete = true;
            $(this).removeClass("icon-check-empty").addClass("icon-check").attr('title', 'Mark as uncompleted task');
            $(this).next().addClass("complete");
        } else {
            singleDayTask[selectedDay][taskIndex].complete = false;
            $(this).removeClass("icon-check").addClass("icon-check-empty").attr('title', 'Mark as completed task');
            $(this).next().removeClass("complete");
        }
        saveTasks();
        isComplete();
    }

    function isComplete() {
        if (singleDayTask[selectedDay] !== undefined && singleDayTask[selectedDay].length > 0) {
            var completeIndex = singleDayTask[selectedDay].map(function(singleTask) {
                return singleTask.complete;
            }).indexOf(true);

            if (completeIndex >= 0) {
                removeCompleteBtn.removeAttr('disabled');
            } else {
                removeCompleteBtn.attr('disabled', 'disabled');
            }
        }
    }

    function deleteTask() {
        var id = $(this).next().next().data('id');
        var taskIndex = singleDayTask[selectedDay].map(function(singleTask) {
            return singleTask.id;
        }).indexOf(id);

        singleDayTask[selectedDay].splice(taskIndex, 1);
        saveTasks();
        renderTasks(singleDayTask);
    }

    function editTask() {
        var id = $(this).prev().data('id');
        var taskIndex = singleDayTask[selectedDay].map(function(singleTask) {
            return singleTask.id;
        }).indexOf(id);

        if ($(this).prev().attr('contenteditable') === 'false') {
            $(this).prev().attr('contenteditable', 'true').addClass("editable");
            $(this).next().removeAttr('disabled');
            $(this).removeClass("icon-edit-alt").addClass("icon-save").attr('title', 'Save task');
        } else {
            if ($.trim($(this).prev().text()).length <= 2) {
                modalText.text('The text of the task is too short');
                modal.css('display', 'block');
                return;
            } else if ($.trim($(this).prev().text()).length >= 100) {
                modalText.text('The text of the task is too long');
                modal.css('display', 'block');
                return;
            }

            singleDayTask[selectedDay][taskIndex].taskText = $(this).prev().text();
            singleDayTask[selectedDay][taskIndex].priority = $(this).next().val();

            saveTasks();
            renderTasks(singleDayTask);

            $(this).prev().attr('contenteditable', 'false').removeClass("editable");
            $(this).next().attr('disabled', 'disabled');
            $(this).removeClass("icon-save").addClass("icon-edit-alt").attr('title', 'Edit task');
        }
    }

    removeCompleteBtn.on('click', function() {
        var completeArray = singleDayTask[selectedDay].map(function(singleTask) {
            return singleTask.complete;
        });

        for (var i = 0; i < completeArray.length; i++) {
            if (completeArray[i] === true) {
                singleDayTask[selectedDay].splice(i, 1);
                completeArray = singleDayTask[selectedDay].map(function(singleTask) {
                    return singleTask.complete;
                });
                i -= 1;
            }
        }
        saveTasks();
        renderTasks(singleDayTask);
        $(this).attr('disabled', 'disabled');
    });

    removeAllBtn.on('click', function() {
        modalText.html('<p>Are you sure you want to delete ALL tasks of the day?</p><button id="yesDelete" class="button modalBtn">YES</button><button id="noDelete" class="button modalBtn">NO</button>');
        modal.css('display', 'block');
        modal.find('#yesDelete').on('click', function() {
            delete singleDayTask[selectedDay];
            saveTasks();
            renderTasks(singleDayTask);
            modal.css('display', 'none');
        });
        modal.find('#noDelete').on('click', function() {
            modal.css('display', 'none');
        });
    });

    loadTasks();

    closeModal.on('click', function() {
        modal.css('display', 'none');
    });

    $(window).on('click', function(event) {
        if (event.target == modal[0]) {
            modal.css('display', 'none');
        }
    });

});
