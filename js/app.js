$(function () {

    var app = $('#app'),
        callendar = $('#datepicker'),
        addBtn = $('#add-task-btn'),
        taskInput = $('#task-input'),
        priority = $('#priority'),
        taskList = $('#task-list'),
        removeCompletedBtn = $('#remove-completed-btn'),
        removeAllBtn = $('#remove-all-tasks-btn'),
        modal = $('#modal'),
        closeModal = $('#close-modal'),
        modalText = $('#modal-text'),
        singleDayTask = {};

    callendar.datepicker({ firstDay: 1 });

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
        return trimInput >= 2 && trimInput < 100;
    }

    function addEventsToErrorModal() {
        $('#ok-btn').on('click', hideModal);
    }

    function showErrorModal() {
        var modalContent = '<p>The text of the task should contain from 3 to 100 characters</p><button id="ok-btn" class="button button--modal">OK</button>';
        showModal(modalContent);
        addEventsToErrorModal();
    }

    function saveTasks(task) {
        singleDayTask[selectedDay] = singleDayTask[selectedDay] || [];
        singleDayTask[selectedDay].push({
            taskText: task.inputValue,
            completed: task.isCompleted,
            id: task.id,
            priority: task.priorityValue
        });
    }

    function clearTaskInputState() {
        taskInput.val('');
        priority.val('2');
        taskInput.css('height', '27px');
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
        $(".js-deleteBtn").on('click', deleteTask);
        $(".js-completedBtn").on('click', toggleCompletedTask);
        $(".js-editBtn").on('click', editTask);
    }

   function markOptionAsSelected(value, option) {
        $(option).find('option[value="' + value + '"]').attr('selected', 'selected');
    }

    function setPriority() {
        var select = $('ul select');

        $.each(select, function (i, option) {
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

    function markTasksAsCompleted() {
        var tasks = $('.task');
        $.each(tasks, function (i, task) {
            if ($(task).data('completed')) {
                $(task).addClass('newTask__text--completed');
                $(task).prev().addClass('icon-check').attr('title', 'Mark as uncompleted task');
            }
        });
    }

    function getCompletedIndex() {
        return singleDayTask[selectedDay].map(function (singleTask) {
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

    function createTaskLine(task) {
        return '<li class="newTask__line"><button type="button" class="js-deleteBtn button icon-trash" title="Delete task"></button><button type="button" class="js-completedBtn button icon-check-empty" title="Mark as completed task"></button><div  class="task newTask__text" data-completed="' + task.completed + '" data-id="' + task.id + '" data-priority="' + task.priority + '" contentEditable="' + false + '">' + task.taskText + '</div><button class="js-editBtn button icon-edit-alt" type="button" title="Edit task"></button><select class="newTask__priority" title="Select priority" disabled><option value="1">High</option><option value="2">Normal</option><option value="3">Low</option></select></li>';
    }

    function createInfoNoTasks() {
        return '<li class="newTask__line"><span class="task newTask__text newTask__text--noTasks">No tasks to do on this day</span></li>';
    }

    function renderTasks(singleDayTask) {
        var resultHtml = '';

        taskList.html('');

        if (isTaskPossibleToRender()) {
            singleDayTask[selectedDay].sort(comparePriority);
            $.each(singleDayTask[selectedDay], function (i, task) {
                resultHtml += createTaskLine(task);
                removeAllBtn.removeAttr('disabled').addClass('button--active');
            });
        } else {
            resultHtml += createInfoNoTasks();
            removeAllBtn.attr('disabled', 'disabled').removeClass('button--active');
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
            id: Date.now(),
            priorityValue: priority.val()
        };

        if (!isInputValid(task.inputValue)) {
            showErrorModal();
            return;
        }

        saveTasks(task);
        clearTaskInputState();
        addTaskToDatabase();
        renderTasks(singleDayTask);
    }

    function loadTasks() {
        firebase.database().ref('singleDayTask').once('value', function (data) {
            singleDayTask = data.val();
            renderTasks(singleDayTask);
        });
    }

    function getTaskIndex(task) {
        var id = task.parent().find('.task').data('id');

        return singleDayTask[selectedDay].map(function (singleTask) {
            return singleTask.id;
        }).indexOf(id);
    }

    function markCurrentTaskAsCompleted(button) {
        singleDayTask[selectedDay][getTaskIndex(button)].completed = true;
        button.removeClass("icon-check-empty").addClass("icon-check").attr('title', 'Mark as uncompleted task');
        button.next().addClass("newTask__text--completed");
    }

    function markCurrentTaskAsUncompleted(button) {
        singleDayTask[selectedDay][getTaskIndex(button)].completed = false;
        button.removeClass("icon-check").addClass("icon-check-empty").attr('title', 'Mark as completed task');
        button.next().removeClass("newTask__text--completed");

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

    function deleteTask() {
        singleDayTask[selectedDay].splice(getTaskIndex($(this)), 1);
        addTaskToDatabase();
        renderTasks(singleDayTask);
    }

    function enableToEdit(button) {
        button.prev().attr('contenteditable', 'true').addClass("newTask__text--editable");
        button.next().removeAttr('disabled');
        button.removeClass("icon-edit-alt").addClass("icon-save").attr('title', 'Save task');
    }

    function disableToEdit(button) {
        button.prev().attr('contenteditable', 'false').removeClass("newTask__text--editable");
        button.next().attr('disabled', 'disabled');
        button.removeClass("icon-save").addClass("icon-edit-alt").attr('title', 'Edit task');
    }

    function saveEditedTask(button) {
        var taskToEdit = singleDayTask[selectedDay][getTaskIndex(button)];
        var taskEditedText = button.prev().text();

        if (!isInputValid(taskEditedText)) {
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

    function removeCompletedTasks() {
        var completeArray = singleDayTask[selectedDay].map(function (singleTask) {
            return singleTask.completed;
        });

        for (var i = 0; i < completeArray.length; i++) {
            if (completeArray[i]) {
                singleDayTask[selectedDay].splice(i, 1);
                completeArray = singleDayTask[selectedDay].map(function (singleTask) {
                    return singleTask.completed;
                });
                i -= 1;
            }
        }
        addTaskToDatabase();
        renderTasks(singleDayTask);
        $(this).attr('disabled', 'disabled');
    }

    function addEventsToAskModal() {
        $('#yes-delete-btn').on('click', removeAllTasks);
        $('#no-delete-btn').on('click', hideModal);
    }

    function showAskModal() {
        var modalContent = '<p>Are you sure you want to delete ALL tasks of the day?</p><button id="yes-delete-btn" class="button button--modal">YES</button><button id="no-delete-btn" class="button button--modal">NO</button>';

        showModal(modalContent);
        addEventsToAskModal();
    }

    function hideModal() {
        modal.css('display', 'none');
    }

    function showModal(modalContent) {
        modalText.html(modalContent);
        modal.css('display', 'block');
    }

    function removeAllTasks() {
        delete singleDayTask[selectedDay];
        addTaskToDatabase();
        renderTasks(singleDayTask);
        hideModal();
    }

    loadTasks();

    addBtn.on('click', addTask);
    callendar.on('change', selectDay);
    taskInput.on('keyup', adjustTaskInputHeight);
    removeCompletedBtn.on('click', removeCompletedTasks);
    removeAllBtn.on('click', showAskModal);
    closeModal.on('click', hideModal);

});
