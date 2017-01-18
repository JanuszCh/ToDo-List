$(function() {

    var app = $('#app'),
        taskInput = $('#taskInput'),
        addBtn = $('#addTaskBtn'),
        priority = $('#priority'),
        taskList = $('#taskList'),
        removeCompletedBtn = $('#removeCompletedBtn'),
        removeAllBtn = $('#removeAllTasksBtn'),
        modal = $('#modal'),
        closeModal = $('#closeModal'),
        modalText = $('#modalText'),
        callendar = $('#datepicker'),
        singleDayTask = {};

    callendar.datepicker({firstDay: 1});

    var selectedDay = callendar.datepicker('getDate').toLocaleDateString().replace(/\./g, '-');

    function selectDay() {
        selectedDay = callendar.datepicker('getDate').toLocaleDateString().replace(/\./g, '-');
        renderTasks(singleDayTask);
    }

    function adjustTaskInputHeight() {
        $(this).css('height', '1px');
        var height = (5 + $(this).prop('scrollHeight')) + "px";
        $(this).css('height', height);
    }

    function isInputValid(taskInput) {
        var trimInput = $.trim(taskInput).length;
        return trimInput <= 2 || trimInput > 100;
    }

    function showErrorModal() {
        modalText.html('<p>The text of the task should contain from 3 to 100 characters</p><button id="okBtn" class="button modalBtn">OK</button>');
        modal.css('display', 'block');
        $('#okBtn').on('click', hideModal);
    }

    function saveTasks(task) {
        singleDayTask[selectedDay] = singleDayTask[selectedDay] || [];
        singleDayTask[selectedDay].push({
            taskText: task.inputValue,
            completed: task.isCompleted,
            id: task.idVal,
            priority: task.priorityValue
        });
    }

    function clearTaskInputState() {
        taskInput.val('');
        priority.val('2');
    }

    function addTaskToDatabase() {
        firebase.database().ref('singleDayTask').set(singleDayTask);
    }

    function comparePriority(prev, next) {
        return prev.priority - next.priority;
    }

    function isTaskPossibleToRender() {
        return singleDayTask[selectedDay] !== undefined && singleDayTask[selectedDay].length > 0;
    }

    function addEventsToSingleTask() {
        $(".deleteBtn").on('click', deleteTask);
        $(".completedBtn").on('click', toggleCompletedTask);
        $(".editBtn").on('click', editTask);
    }

    function renderTasks(singleDayTask) {
        var resultHtml = '';

        taskList.html('');

        if (isTaskPossibleToRender()) {
            singleDayTask[selectedDay].sort(comparePriority);
            $.each(singleDayTask[selectedDay], function(i, task) {
                resultHtml += createTaskLine(task);
                removeAllBtn.removeAttr('disabled').addClass('active');
            });
        } else {
            resultHtml += createInfoNoTasks();
            removeAllBtn.attr('disabled', 'disabled').removeClass('active');
        }

        taskList.html(resultHtml);

        setPriority();
        markTasksAsCompleted();
        activateRemoveCompletedBtn();
        addEventsToSingleTask();
    }

    function addTask() {
        var task = {
            inputValue: taskInput.val(),
            isCompleted: false,
            idVal: Date.now(),
            priorityValue: priority.val()
        };

        if (isInputValid(task.inputValue)) {
            showErrorModal();
            return;
        }

        saveTasks(task);
        clearTaskInputState();
        addTaskToDatabase();
        renderTasks(singleDayTask);
    }

    function loadTasks() {
        firebase.database().ref('singleDayTask').once('value', function(data) {
            singleDayTask = data.val();
            renderTasks(singleDayTask);
        });
    }

    function markTasksAsCompleted() {
        var tasks = $('.task');
        $.each(tasks, function(i, task) {
            if ($(task).data('completed')) {
                $(task).addClass('complete');
                $(task).prev().addClass('icon-check').attr('title', 'Mark as uncompleted task');
            }
        });
    }

    function setPriority() {
        var select = $('ul select');

        $.each(select, function(i, option) {
            var priorityValue = $(option).prev().prev().data('priority');
            if (priorityValue === 1) {
                markOptionAsSelected(1, option);
            } else if (priorityValue === 2) {
                markOptionAsSelected(2, option);
            } else {
                markOptionAsSelected(3, option);
            }
        });
    }

    function markOptionAsSelected(value, option) {
        $(option).find('option[value="' + value + '"]').attr('selected', 'selected');
    }

    function createTaskLine(task) {
        return '<li class="taskLine"><button type="button" class="deleteBtn button icon-trash" title="Delete task"></button><button type="button" class="completedBtn button icon-check-empty" title="Mark as completed task"></button><div  class="task taskText" data-completed="' + task.completed + '" data-id="' + task.id + '" data-priority="' + task.priority + '" contentEditable="' + false + '">' + task.taskText + '</div><button class="editBtn button icon-edit-alt" type="button" title="Edit task"></button><select class="priority" title="Select priority" disabled><option value="1">High</option><option value="2">Normal</option><option value="3">Low</option></select></li>';
    }

    function createInfoNoTasks() {
        return '<li class="taskLine"><span class="task taskText noTasks">No tasks to do on this day</span></li>';
    }

    function getTaskIndex(task) {
        var id = task.parent().find('.task').data('id');

        return singleDayTask[selectedDay].map(function(singleTask) {
            return singleTask.id;
        }).indexOf(id);
    }

    function markCurrentTaskAsCompleted(button) {
        singleDayTask[selectedDay][getTaskIndex(button)].completed = true;
        button.removeClass("icon-check-empty").addClass("icon-check").attr('title', 'Mark as uncompleted task');
        button.next().addClass("complete");
    }

    function markCurrentTaskAsUncompleted(button) {
        singleDayTask[selectedDay][getTaskIndex(button)].completed = false;
        button.removeClass("icon-check").addClass("icon-check-empty").attr('title', 'Mark as completed task');
        button.next().removeClass("complete");

    }

    function toggleCompletedTask() {
        if (!singleDayTask[selectedDay][getTaskIndex($(this))].completed) {
            markCurrentTaskAsCompleted($(this));
        } else {
            markCurrentTaskAsUncompleted($(this));
        }
        addTaskToDatabase();
        activateRemoveCompletedBtn();
    }

    function getCompletedIndex() {
        return singleDayTask[selectedDay].map(function(singleTask) {
            return singleTask.completed;
        }).indexOf(true);
    }

    function activateRemoveCompletedBtn() {
        if (isTaskPossibleToRender()) {
            getCompletedIndex() >= 0 ? removeCompletedBtn.removeAttr('disabled') :
                                       removeCompletedBtn.attr('disabled', 'disabled');
        } else {
            removeCompletedBtn.attr('disabled', 'disabled');
        }
    }

    function deleteTask() {
        singleDayTask[selectedDay].splice(getTaskIndex($(this)), 1);
        addTaskToDatabase();
        renderTasks(singleDayTask);
    }

    function enableToEdit(button) {
        button.prev().attr('contenteditable', 'true').addClass("editable");
        button.next().removeAttr('disabled');
        button.removeClass("icon-edit-alt").addClass("icon-save").attr('title', 'Save task');
    }

    function disableToEdit(button) {
        button.prev().attr('contenteditable', 'false').removeClass("editable");
        button.next().attr('disabled', 'disabled');
        button.removeClass("icon-save").addClass("icon-edit-alt").attr('title', 'Edit task');
    }

    function saveEditedTask(button) {
        var taskToEdit = singleDayTask[selectedDay][getTaskIndex(button)];
        var taskEditedText = button.prev().text();

        if (isInputValid(taskEditedText)) {
            showErrorModal();
            return;
        }

        taskToEdit.taskText = taskEditedText;
        taskToEdit.priority = button.next().val();

        addTaskToDatabase();
        renderTasks(singleDayTask);
    }

    function isTaskPossibleToEdit(button) {
        return button.prev().attr('contenteditable') === 'false';
    }

    function editTask() {
        if (isTaskPossibleToEdit($(this))) {
            enableToEdit($(this));
        } else {
            saveEditedTask($(this));
            disableToEdit($(this));
        }
    }

    function removeCompletedTasks(){
        var completeArray = singleDayTask[selectedDay].map(function(singleTask) {
            return singleTask.completed;
        });

        for (var i = 0; i < completeArray.length; i++) {
            if (completeArray[i]) {
                singleDayTask[selectedDay].splice(i, 1);
                completeArray = singleDayTask[selectedDay].map(function(singleTask) {
                    return singleTask.completed;
                });
                i -= 1;
            }
        }
        addTaskToDatabase();
        renderTasks(singleDayTask);
        $(this).attr('disabled', 'disabled');
    }

    function showAskModal() {
        modalText.html('<p>Are you sure you want to delete ALL tasks of the day?</p><button id="yesDeleteBtn" class="button modalBtn">YES</button><button id="noDeleteBtn" class="button modalBtn">NO</button>');
        modal.css('display', 'block');

        addEventsToAskModal();
    }

    function hideModal() {
        modal.css('display', 'none');
    }

    function removeAllTasks() {
            delete singleDayTask[selectedDay];
            addTaskToDatabase();
            renderTasks(singleDayTask);
            hideModal();
    }

    function addEventsToAskModal() {
        $('#yesDeleteBtn').on('click', removeAllTasks);
        $('#noDeleteBtn').on('click', hideModal);
    }

    loadTasks();

    addBtn.on('click', addTask);
    callendar.on('change', selectDay);
    taskInput.on('keyup', adjustTaskInputHeight);
    removeCompletedBtn.on('click', removeCompletedTasks);
    removeAllBtn.on('click', showAskModal);
    closeModal.on('click', hideModal);

});
